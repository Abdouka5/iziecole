"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";

// One student's full "composition du trimestre": the form posts
// subjectId_<rowKey>/coefficient_<rowKey>/score_<rowKey> triplets, one per
// matière row in the editor. Rows hang off a class_subjects row (a subject
// taught in a class) — created here the first time a matière is graded, same
// as before, except now coefficient comes from the row too (school admins
// can change it; teachers' edits to that field are ignored, matching the
// RLS on class_subjects itself).
export async function saveStudentGrades(formData) {
  const membership = await getCurrentMembership();
  const schoolId = membership.school.id;
  const supabase = await createClient();
  const isAdmin = membership.role === "school_admin";

  const studentId = formData.get("studentId")?.toString();
  const classId = formData.get("classId")?.toString();
  const termId = formData.get("termId")?.toString();
  // Whatever top-level filters (classId/subjectId/q/...) were set on the
  // page before "Saisir des notes" was opened — unrelated to the studentId/
  // termId being graded here, kept so saving doesn't reset them.
  const returnTo = formData.get("returnTo")?.toString() ?? "";
  if (!studentId || !classId || !termId) redirect("/grades");

  const back = (extra) => {
    const target = new URLSearchParams(returnTo);
    target.set("entry", "1");
    target.set("studentId", studentId);
    target.set("termId", termId);
    for (const [key, value] of Object.entries(extra)) target.set(key, value);
    redirect(`/grades?${target.toString()}`);
  };

  const rowsByKey = new Map();
  for (const [field, value] of formData.entries()) {
    const match = /^(subjectId|coefficient|score)_(.+)$/.exec(field);
    if (!match) continue;
    const [, prop, rowKey] = match;
    const entry = rowsByKey.get(rowKey) ?? {};
    entry[prop] = value?.toString();
    rowsByKey.set(rowKey, entry);
  }

  // Keyed by subjectId, not rowKey, so a subject picked twice (shouldn't
  // happen — the editor hides already-used subjects — but could via a stale
  // tab) collapses to one row instead of hitting grades' unique constraint.
  const bySubject = new Map();
  for (const row of rowsByKey.values()) {
    if (!row.subjectId || row.score === "" || row.score == null) continue;
    const score = Number(row.score);
    if (!Number.isFinite(score)) continue;
    const coefficient = Number(row.coefficient);
    bySubject.set(row.subjectId, { score, coefficient: Number.isFinite(coefficient) && coefficient > 0 ? coefficient : 1 });
  }

  const classSubjectIdBySubject = new Map();
  for (const [subjectId, { coefficient }] of bySubject) {
    let { data: cs } = await supabase
      .from("class_subjects")
      .select("id, coefficient")
      .eq("class_id", classId)
      .eq("subject_id", subjectId)
      .maybeSingle();

    if (!cs) {
      const { data: created, error } = await supabase
        .from("class_subjects")
        .insert({ school_id: schoolId, class_id: classId, subject_id: subjectId, coefficient })
        .select("id, coefficient")
        .single();
      if (error) back({ entryError: `Impossible d'enregistrer : ${error.message}` });
      cs = created;
    } else if (isAdmin && Number(cs.coefficient) !== coefficient) {
      await supabase.from("class_subjects").update({ coefficient }).eq("id", cs.id);
    }
    classSubjectIdBySubject.set(subjectId, cs.id);
  }

  if (classSubjectIdBySubject.size > 0) {
    const { error } = await supabase.from("grades").upsert(
      [...bySubject.entries()].map(([subjectId, { score }]) => ({
        school_id: schoolId,
        student_id: studentId,
        class_subject_id: classSubjectIdBySubject.get(subjectId),
        term_id: termId,
        score,
        graded_by: membership.userId,
      })),
      { onConflict: "student_id,class_subject_id,term_id" },
    );
    if (error) back({ entryError: `Impossible d'enregistrer : ${error.message}` });
  }

  // Rows removed in the editor (previously saved, not resubmitted) need
  // their grade deleted, not just left stale — scoped to this class's
  // matières so it can never touch another class's data.
  const { data: classSubjects } = await supabase.from("class_subjects").select("id").eq("class_id", classId);
  const toDelete = (classSubjects ?? [])
    .map((cs) => cs.id)
    .filter((id) => ![...classSubjectIdBySubject.values()].includes(id));
  if (toDelete.length > 0) {
    await supabase.from("grades").delete().eq("student_id", studentId).eq("term_id", termId).in("class_subject_id", toDelete);
  }

  revalidatePath("/grades");
  const target = new URLSearchParams(returnTo);
  target.set("saved", "1");
  redirect(`/grades?${target.toString()}`);
}

// "Appréciation du conseil de classe" for one student's bulletin, scoped to
// a single term — saved separately from grades since it's prose, not a
// per-subject score.
export async function saveAppreciation(formData) {
  const membership = await getCurrentMembership();
  const schoolId = membership.school.id;
  const supabase = await createClient();

  const studentId = formData.get("studentId")?.toString();
  const termId = formData.get("termId")?.toString();
  const comment = formData.get("comment")?.toString().trim() ?? "";
  const classId = formData.get("classId")?.toString() ?? "";
  if (!studentId || !termId) redirect("/grades");

  const back = (extra) =>
    redirect(`/grades?${new URLSearchParams({ classId, termId, ...extra }).toString()}`);

  const { error } = await supabase
    .from("report_card_comments")
    .upsert(
      { school_id: schoolId, student_id: studentId, term_id: termId, comment: comment || null },
      { onConflict: "student_id,term_id" },
    );
  if (error) back({ appreciationError: error.message, appreciation: studentId });

  revalidatePath("/grades");
  back({ appreciationSaved: "1" });
}
