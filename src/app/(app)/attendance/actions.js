"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";

export async function createAttendance(formData) {
  const membership = await getCurrentMembership();
  const schoolId = membership.school.id;
  const supabase = await createClient();

  const studentId = formData.get("studentId")?.toString();
  const classId = formData.get("classId")?.toString() || null;
  const type = formData.get("type")?.toString();
  const occurredOn = formData.get("occurredOn")?.toString() || new Date().toISOString().slice(0, 10);
  const reason = formData.get("reason")?.toString().trim() || null;
  const justified = formData.get("justified") === "oui";

  if (!studentId || !type) {
    redirect(`/attendance?new=1&error=${encodeURIComponent("Élève et type sont obligatoires.")}`);
  }

  const { data: record, error } = await supabase
    .from("attendance_records")
    .insert({
      school_id: schoolId,
      student_id: studentId,
      class_id: classId,
      type,
      occurred_on: occurredOn,
      reason,
      justified,
      recorded_by: membership.userId,
    })
    .select("id")
    .single();

  if (error) {
    redirect(`/attendance?new=1&error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/attendance");
  redirect(`/attendance?ticket=${record.id}`);
}

export async function toggleJustified(formData) {
  const supabase = await createClient();
  const recordId = formData.get("recordId")?.toString();
  const justified = formData.get("justified")?.toString() === "true";
  if (!recordId) return;

  await supabase.from("attendance_records").update({ justified }).eq("id", recordId);
  revalidatePath("/attendance");
}

export async function deleteAttendance(formData) {
  const supabase = await createClient();
  const recordId = formData.get("recordId")?.toString();
  if (!recordId) return;

  await supabase.from("attendance_records").delete().eq("id", recordId);
  revalidatePath("/attendance");
}
