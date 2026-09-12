"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";

// Bulk save: the form posts one score_<studentId> field per roster row for
// the selected class_subject + term. Empty fields are skipped (no grade
// entered yet), not saved as zero.
export async function saveGrades(formData) {
  const membership = await getCurrentMembership();
  const schoolId = membership.school.id;
  const supabase = await createClient();

  const classSubjectId = formData.get("classSubjectId")?.toString();
  const termId = formData.get("termId")?.toString();
  if (!classSubjectId || !termId) return;

  const rows = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("score_") || value === "") continue;
    const studentId = key.slice("score_".length);
    const score = Number(value);
    if (Number.isNaN(score)) continue;
    rows.push({
      school_id: schoolId,
      student_id: studentId,
      class_subject_id: classSubjectId,
      term_id: termId,
      score,
      graded_by: membership.userId,
    });
  }

  if (rows.length === 0) return;

  await supabase
    .from("grades")
    .upsert(rows, { onConflict: "student_id,class_subject_id,term_id" });

  revalidatePath("/grades");
}
