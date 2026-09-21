"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";

// Bulk save: the form posts one score_<studentId> field per roster row for
// the selected class + subject + term. Empty fields are skipped (no grade
// entered yet), not saved as zero.
//
// Grades hang off a class_subjects row (a subject taught in a class), but
// nothing in the app creates those — so the row for this class + subject is
// created here the first time it's needed instead of requiring a setup step
// that doesn't exist. (Only a school admin can create it; a teacher can
// still grade a subject that has already been assigned to them.)
export async function saveGrades(formData) {
  const membership = await getCurrentMembership();
  const schoolId = membership.school.id;
  const supabase = await createClient();

  const classId = formData.get("classId")?.toString();
  const subjectId = formData.get("subjectId")?.toString();
  const termId = formData.get("termId")?.toString();
  if (!classId || !subjectId || !termId) redirect("/grades");

  const back = (extra) =>
    redirect(`/grades?${new URLSearchParams({ classId, subjectId, termId, ...extra }).toString()}`);

  const rows = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("score_") || value === "") continue;
    const score = Number(value);
    if (Number.isNaN(score)) continue;
    rows.push({ studentId: key.slice("score_".length), score });
  }
  if (rows.length === 0) back({ entry: "1", entryError: "Aucune note saisie." });

  let { data: classSubject } = await supabase
    .from("class_subjects")
    .select("id")
    .eq("class_id", classId)
    .eq("subject_id", subjectId)
    .maybeSingle();

  if (!classSubject) {
    const { data: created, error: createError } = await supabase
      .from("class_subjects")
      .insert({ school_id: schoolId, class_id: classId, subject_id: subjectId })
      .select("id")
      .single();
    if (createError) {
      back({ entry: "1", entryError: `Impossible d'enregistrer : ${createError.message}` });
    }
    classSubject = created;
  }

  const { error } = await supabase.from("grades").upsert(
    rows.map((r) => ({
      school_id: schoolId,
      student_id: r.studentId,
      class_subject_id: classSubject.id,
      term_id: termId,
      score: r.score,
      graded_by: membership.userId,
    })),
    { onConflict: "student_id,class_subject_id,term_id" },
  );
  if (error) back({ entry: "1", entryError: `Impossible d'enregistrer : ${error.message}` });

  revalidatePath("/grades");
  back({ saved: "1" });
}
