"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";

export async function createSlot(formData) {
  const membership = await getCurrentMembership();
  const schoolId = membership.school.id;
  const supabase = await createClient();

  const classId = formData.get("classId")?.toString();
  const classSubjectId = formData.get("classSubjectId")?.toString();
  const schoolYearId = formData.get("schoolYearId")?.toString();
  const dayOfWeek = formData.get("dayOfWeek")?.toString();
  const startTime = formData.get("startTime")?.toString();
  const endTime = formData.get("endTime")?.toString();
  const roomId = formData.get("roomId")?.toString() || null;

  if (!classId || !classSubjectId || !schoolYearId || !dayOfWeek || !startTime || !endTime) {
    redirect(`/schedule?classId=${classId}&new=1&error=${encodeURIComponent("Merci de remplir tous les champs.")}`);
  }

  const { data: classSubject } = await supabase
    .from("class_subjects")
    .select("subject_id, teacher_id")
    .eq("id", classSubjectId)
    .maybeSingle();

  const { error } = await supabase.from("timetable_slots").insert({
    school_id: schoolId,
    school_year_id: schoolYearId,
    class_id: classId,
    subject_id: classSubject?.subject_id,
    teacher_id: classSubject?.teacher_id,
    room_id: roomId,
    day_of_week: Number(dayOfWeek),
    start_time: startTime,
    end_time: endTime,
  });

  if (error) {
    redirect(`/schedule?classId=${classId}&new=1&error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/schedule");
  redirect(`/schedule?classId=${classId}`);
}

export async function deleteSlot(formData) {
  const supabase = await createClient();
  const slotId = formData.get("slotId")?.toString();
  if (!slotId) return;
  await supabase.from("timetable_slots").delete().eq("id", slotId);
  revalidatePath("/schedule");
}
