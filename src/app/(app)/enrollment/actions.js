"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";
import { recordInscriptionPayment } from "@/lib/inscription-payment";

// The "Élève existant" tab of the Inscription tool: no new students row —
// just an enrollments upsert (same onConflict as updateStudent's class
// change) for a student who's already in the system, plus a row in
// enrollment_registrations so it shows up in this page's own history too,
// and an optional frais d'inscription payment (same as the new-student form).
export async function enrollExistingStudent(formData) {
  const membership = await getCurrentMembership();
  const schoolId = membership.school.id;
  const supabase = await createClient();

  const studentId = formData.get("studentId")?.toString();
  const classId = formData.get("classId")?.toString();
  const schoolYearId = formData.get("schoolYearId")?.toString();
  const inscriptionAmount = Number(formData.get("inscriptionAmount")) || 0;
  const inscriptionMethod = formData.get("inscriptionMethod")?.toString() || "especes";

  const errorRedirect = (message) =>
    redirect(`/enrollment?existing=1&error=${encodeURIComponent(message)}`);

  if (!studentId) errorRedirect("Sélectionnez un élève.");
  if (!classId) errorRedirect("Sélectionnez une classe.");
  if (!schoolYearId) errorRedirect("Aucune année scolaire active n'est configurée.");

  const { error } = await supabase
    .from("enrollments")
    .upsert(
      { school_id: schoolId, student_id: studentId, school_year_id: schoolYearId, class_id: classId, status: "active" },
      { onConflict: "student_id,school_year_id" },
    );
  if (error) errorRedirect(error.message);

  const { error: logError } = await supabase.from("enrollment_registrations").insert({
    school_id: schoolId,
    student_id: studentId,
    school_year_id: schoolYearId,
    class_id: classId,
    registered_by: membership.userId,
  });
  if (logError) errorRedirect(logError.message);

  let paymentId = null;
  if (inscriptionAmount > 0) {
    const { data: cls } = await supabase.from("classes").select("level_id").eq("id", classId).maybeSingle();
    if (cls?.level_id) {
      const result = await recordInscriptionPayment(supabase, {
        schoolId,
        studentId,
        levelId: cls.level_id,
        schoolYearId,
        amount: inscriptionAmount,
        method: inscriptionMethod,
        registeredBy: membership.userId,
      });
      paymentId = result.paymentId ?? null;
      if (paymentId) revalidatePath("/finance");
    }
  }

  revalidatePath("/enrollment");
  revalidatePath("/students");
  redirect(paymentId ? `/enrollment?receipt=${paymentId}` : "/enrollment");
}
