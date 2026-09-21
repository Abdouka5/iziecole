"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";

const hhmm = (t) => t?.slice(0, 5) ?? "";

export async function createSlot(formData) {
  const membership = await getCurrentMembership();
  const schoolId = membership.school.id;
  const supabase = await createClient();

  const classId = formData.get("classId")?.toString();
  const subjectId = formData.get("subjectId")?.toString();
  const schoolYearId = formData.get("schoolYearId")?.toString();
  const dayOfWeek = formData.get("dayOfWeek")?.toString();
  const startTime = formData.get("startTime")?.toString();
  const endTime = formData.get("endTime")?.toString();

  const back = (message) =>
    redirect(`/schedule?classId=${classId}&new=1&error=${encodeURIComponent(message)}`);

  if (!classId || !subjectId || !schoolYearId || !dayOfWeek || !startTime || !endTime) {
    back("Merci de remplir tous les champs.");
  }
  if (endTime <= startTime) {
    back("L'heure de fin doit être après l'heure de début.");
  }

  // A course can't overlap another one of the same class on the same day
  // (the DB only guards teacher/room clashes, and neither is set here).
  const { data: sameDay } = await supabase
    .from("timetable_slots")
    .select("start_time, end_time, subjects(name)")
    .eq("class_id", classId)
    .eq("day_of_week", Number(dayOfWeek));
  const clash = (sameDay ?? []).find((s) => hhmm(s.start_time) < endTime && hhmm(s.end_time) > startTime);
  if (clash) {
    back(
      `Ce créneau chevauche un autre cours de la classe (${clash.subjects?.name ?? "cours"}, ${hhmm(clash.start_time)} - ${hhmm(clash.end_time)}).`,
    );
  }

  // Keep the teacher if this subject was already assigned to the class
  // (class_subjects); otherwise the course simply has no teacher recorded.
  const { data: assignment } = await supabase
    .from("class_subjects")
    .select("teacher_id")
    .eq("class_id", classId)
    .eq("subject_id", subjectId)
    .maybeSingle();

  const { error } = await supabase.from("timetable_slots").insert({
    school_id: schoolId,
    school_year_id: schoolYearId,
    class_id: classId,
    subject_id: subjectId,
    teacher_id: assignment?.teacher_id ?? null,
    day_of_week: Number(dayOfWeek),
    start_time: startTime,
    end_time: endTime,
  });

  if (error) {
    back(error.message);
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
