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

export async function createStudent(formData) {
  const membership = await getCurrentMembership();
  const schoolId = membership.school.id;
  const supabase = await createClient();

  const firstName = formData.get("firstName")?.toString().trim();
  const lastName = formData.get("lastName")?.toString().trim();
  const birthDate = formData.get("birthDate")?.toString() || null;
  const gender = formData.get("gender")?.toString() || null;

  if (!firstName || !lastName) {
    redirect(`/students?new=1&error=${encodeURIComponent("Prénom et nom sont obligatoires.")}`);
  }

  const matricule = await nextMatricule(supabase, schoolId);

  const { error } = await supabase.from("students").insert({
    school_id: schoolId,
    first_name: firstName,
    last_name: lastName,
    birth_date: birthDate,
    gender,
    matricule,
  });

  if (error) {
    redirect(`/students?new=1&error=${encodeURIComponent(error.message)}`);
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
