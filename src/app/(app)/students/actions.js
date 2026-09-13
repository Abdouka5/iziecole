"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";

async function nextMatricule(supabase, schoolId) {
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from("students")
    .select("id", { count: "exact", head: true })
    .eq("school_id", schoolId);
  return `IZ${year}${String((count ?? 0) + 1).padStart(3, "0")}`;
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

export async function createStudent(formData) {
  const membership = await getCurrentMembership();
  const schoolId = membership.school.id;
  const supabase = await createClient();

  const firstName = formData.get("firstName")?.toString().trim();
  const lastName = formData.get("lastName")?.toString().trim();
  const birthDate = formData.get("birthDate")?.toString() || null;
  const birthPlace = formData.get("birthPlace")?.toString().trim() || null;
  const gender = formData.get("gender")?.toString() || null;
  const address = formData.get("address")?.toString().trim() || null;
  const guardians = parseGuardians(formData);

  if (!firstName || !lastName) {
    redirect(`/students?new=1&error=${encodeURIComponent("Prénom et nom sont obligatoires.")}`);
  }

  const matricule = await nextMatricule(supabase, schoolId);

  const { data: student, error } = await supabase
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
    .single();

  if (error) {
    redirect(`/students?new=1&error=${encodeURIComponent(error.message)}`);
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
