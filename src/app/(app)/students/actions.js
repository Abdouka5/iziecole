"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";
import { recordInscriptionPayment } from "@/lib/inscription-payment";

// Based on the highest existing number, not a count of students — a count
// collides with an existing matricule as soon as anyone's ever been
// deleted (count goes back down, but the matricules already issued don't).
async function nextMatricule(supabase, schoolId, attempt = 0) {
  const year = new Date().getFullYear();
  const prefix = `IZ${year}`;
  const { data } = await supabase
    .from("students")
    .select("matricule")
    .eq("school_id", schoolId)
    .like("matricule", `${prefix}%`);

  let max = 0;
  for (const { matricule } of data ?? []) {
    const n = Number(matricule?.slice(prefix.length));
    if (Number.isFinite(n) && n > max) max = n;
  }
  // +attempt covers the (rare) case of two enrollments racing each other —
  // createStudent retries this on a unique-constraint error.
  return `${prefix}${String(max + 1 + attempt).padStart(3, "0")}`;
}

// Guardian rows arrive as guardian_name_<key>/guardian_phone_<key>/
// guardian_relationship_<key> (see guardian-fields.jsx) — the key itself is
// arbitrary, we just group by it.
function parseGuardians(formData) {
  const byKey = new Map();
  for (const [field, value] of formData.entries()) {
    const match = /^guardian_(name|phone|relationship)_(.+)$/.exec(field);
    if (!match) continue;
    const [, prop, key] = match;
    const entry = byKey.get(key) ?? {};
    entry[prop] = value?.toString().trim();
    byKey.set(key, entry);
  }
  return [...byKey.values()].filter((g) => g.name);
}

async function currentSchoolYearId(supabase, schoolId) {
  const { data } = await supabase
    .from("school_years")
    .select("id")
    .eq("school_id", schoolId)
    .eq("is_current", true)
    .maybeSingle();
  return data?.id ?? null;
}

// successPath/errorPath let a second entry point (the Inscription page)
// reuse this same action — and its RLS, matricule numbering, guardians and
// enrollment logic — without landing back on /students. Omitting them keeps
// the "Nouvel élève" modal's existing behavior exactly as it was.
export async function createStudent(formData) {
  const membership = await getCurrentMembership();
  const schoolId = membership.school.id;
  const supabase = await createClient();

  const successPath = formData.get("successPath")?.toString() || "/students";
  const errorPath = formData.get("errorPath")?.toString() || "/students?new=1";
  const errorRedirect = (message) =>
    redirect(`${errorPath}${errorPath.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`);

  const firstName = formData.get("firstName")?.toString().trim();
  const lastName = formData.get("lastName")?.toString().trim();
  const birthDate = formData.get("birthDate")?.toString() || null;
  const birthPlace = formData.get("birthPlace")?.toString().trim() || null;
  const gender = formData.get("gender")?.toString() || null;
  const address = formData.get("address")?.toString().trim() || null;
  const classId = formData.get("classId")?.toString() || null;
  const guardians = parseGuardians(formData);
  // Only the Inscription form sends these — frais d'inscription collected
  // at registration time, recorded in Finance like any other payment.
  const inscriptionAmount = Number(formData.get("inscriptionAmount")) || 0;
  const inscriptionMethod = formData.get("inscriptionMethod")?.toString() || "especes";

  if (!firstName || !lastName) {
    errorRedirect("Prénom et nom sont obligatoires.");
  }
  if (inscriptionAmount > 0 && !classId) {
    errorRedirect("Choisissez une classe pour encaisser les frais d'inscription.");
  }

  let student, error;
  const MAX_ATTEMPTS = 5;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const matricule = await nextMatricule(supabase, schoolId, attempt);
    ({ data: student, error } = await supabase
      .from("students")
      .insert({
        school_id: schoolId,
        first_name: firstName,
        last_name: lastName,
        birth_date: birthDate,
        birth_place: birthPlace,
        address,
        gender,
        matricule,
      })
      .select("id")
      .single());

    // 23505 = unique_violation — two enrollments picked the same matricule
    // at once. Anything else (a real validation error) shouldn't be retried.
    if (!error || error.code !== "23505") break;
  }

  if (error) {
    errorRedirect(error.message);
  }

  if (guardians.length > 0) {
    await supabase.from("guardians").insert(
      guardians.map((g, i) => ({
        school_id: schoolId,
        student_id: student.id,
        full_name: g.name,
        phone: g.phone || null,
        relationship: g.relationship || null,
        is_primary: i === 0,
      })),
    );
  }

  // logRegistration (set only by the Inscription form) also logs this to
  // enrollment_registrations so that page's history shows it — even when
  // no class was picked, since "classe optionnelle" there is intentional.
  const logRegistration = formData.get("logRegistration") === "1";
  let schoolYearId = null;
  if (classId || logRegistration) {
    schoolYearId = await currentSchoolYearId(supabase, schoolId);
    if (schoolYearId) {
      if (classId) {
        await supabase.from("enrollments").insert({
          school_id: schoolId,
          student_id: student.id,
          school_year_id: schoolYearId,
          class_id: classId,
          status: "active",
        });
      }
      if (logRegistration) {
        await supabase.from("enrollment_registrations").insert({
          school_id: schoolId,
          student_id: student.id,
          school_year_id: schoolYearId,
          class_id: classId,
          registered_by: membership.userId,
        });
      }
    }
  }

  let paymentId = null;
  if (inscriptionAmount > 0 && classId && schoolYearId) {
    const { data: cls } = await supabase.from("classes").select("level_id").eq("id", classId).maybeSingle();
    if (cls?.level_id) {
      const result = await recordInscriptionPayment(supabase, {
        schoolId,
        studentId: student.id,
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

  revalidatePath("/students");
  redirect(paymentId ? `${successPath}${successPath.includes("?") ? "&" : "?"}receipt=${paymentId}` : successPath);
}

export async function updateStudent(formData) {
  const membership = await getCurrentMembership();
  const schoolId = membership.school.id;
  const supabase = await createClient();

  const studentId = formData.get("studentId")?.toString();
  const firstName = formData.get("firstName")?.toString().trim();
  const lastName = formData.get("lastName")?.toString().trim();
  const birthDate = formData.get("birthDate")?.toString() || null;
  const birthPlace = formData.get("birthPlace")?.toString().trim() || null;
  const gender = formData.get("gender")?.toString() || null;
  const address = formData.get("address")?.toString().trim() || null;
  const classId = formData.get("classId")?.toString() || null;

  if (!studentId || !firstName || !lastName) {
    redirect(`/students?edit=${studentId}&error=${encodeURIComponent("Prénom et nom sont obligatoires.")}`);
  }

  const { error } = await supabase
    .from("students")
    .update({
      first_name: firstName,
      last_name: lastName,
      birth_date: birthDate,
      birth_place: birthPlace,
      address,
      gender,
    })
    .eq("id", studentId);

  if (error) {
    redirect(`/students?edit=${studentId}&error=${encodeURIComponent(error.message)}`);
  }

  if (classId) {
    const schoolYearId = await currentSchoolYearId(supabase, schoolId);
    if (schoolYearId) {
      await supabase
        .from("enrollments")
        .upsert(
          { school_id: schoolId, student_id: studentId, school_year_id: schoolYearId, class_id: classId, status: "active" },
          { onConflict: "student_id,school_year_id" },
        );
    }
  }

  revalidatePath("/students");
  redirect("/students");
}

export async function deleteStudent(formData) {
  const supabase = await createClient();
  const studentId = formData.get("studentId")?.toString();
  if (!studentId) return;

  await supabase.from("students").delete().eq("id", studentId);
  revalidatePath("/students");
}
