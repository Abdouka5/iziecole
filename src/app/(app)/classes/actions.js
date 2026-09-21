"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";

// Teacher rows arrive as teacher_name_<key>/teacher_phone_<key> (see
// teacher-fields.jsx) — the key is arbitrary, we just group by it. Rows
// without a name are ignored: teachers are optional.
function parseTeachers(formData) {
  const byKey = new Map();
  for (const [field, value] of formData.entries()) {
    const match = /^teacher_(name|phone)_(.+)$/.exec(field);
    if (!match) continue;
    const [, prop, key] = match;
    const entry = byKey.get(key) ?? {};
    entry[prop] = value?.toString().trim();
    byKey.set(key, entry);
  }
  return [...byKey.values()].filter((t) => t.name);
}

function teacherRows(schoolId, classId, teachers) {
  return teachers.map((t, i) => ({
    school_id: schoolId,
    class_id: classId,
    full_name: t.name,
    phone: t.phone || null,
    sort_order: i,
  }));
}

function friendlyClassError(error) {
  // unique (school_year_id, name)
  if (error.code === "23505") return "Une classe porte déjà ce nom pour cette année scolaire.";
  return error.message;
}

export async function createClass(formData) {
  const membership = await getCurrentMembership();
  const schoolId = membership.school.id;
  const supabase = await createClient();

  const name = formData.get("name")?.toString().trim();
  const levelId = formData.get("levelId")?.toString();
  const schoolYearId = formData.get("schoolYearId")?.toString();
  const monthlyFee = formData.get("monthlyFee")?.toString();
  const teachers = parseTeachers(formData);

  if (!name || !levelId || !schoolYearId) {
    redirect(`/classes?new=1&error=${encodeURIComponent("Nom, niveau et année scolaire sont obligatoires.")}`);
  }

  const { data: klass, error } = await supabase
    .from("classes")
    .insert({
      school_id: schoolId,
      school_year_id: schoolYearId,
      level_id: levelId,
      name,
      monthly_fee: monthlyFee ? Number(monthlyFee) : null,
    })
    .select("id")
    .single();

  if (error) {
    redirect(`/classes?new=1&error=${encodeURIComponent(friendlyClassError(error))}`);
  }

  if (teachers.length > 0) {
    const { error: teachersError } = await supabase
      .from("class_teachers")
      .insert(teacherRows(schoolId, klass.id, teachers));
    if (teachersError) {
      revalidatePath("/classes");
      redirect(
        `/classes?alert=${encodeURIComponent(`La classe a été créée, mais ses enseignants n'ont pas pu être enregistrés : ${teachersError.message}`)}`,
      );
    }
  }

  revalidatePath("/classes");
  redirect("/classes");
}

export async function updateClass(formData) {
  const membership = await getCurrentMembership();
  const schoolId = membership.school.id;
  const supabase = await createClient();

  const classId = formData.get("classId")?.toString();
  const name = formData.get("name")?.toString().trim();
  const levelId = formData.get("levelId")?.toString();
  const monthlyFee = formData.get("monthlyFee")?.toString();
  const teachers = parseTeachers(formData);

  if (!classId) redirect("/classes");
  if (!name || !levelId) {
    redirect(`/classes?edit=${classId}&error=${encodeURIComponent("Nom et niveau sont obligatoires.")}`);
  }

  const { error } = await supabase
    .from("classes")
    .update({
      name,
      level_id: levelId,
      monthly_fee: monthlyFee ? Number(monthlyFee) : null,
    })
    .eq("id", classId)
    .eq("school_id", schoolId);

  if (error) {
    redirect(`/classes?edit=${classId}&error=${encodeURIComponent(friendlyClassError(error))}`);
  }

  // Replace the teacher list: add the new rows first and only then drop the
  // old ones, so a failed insert can't leave the class with no teachers.
  const { data: previous } = await supabase.from("class_teachers").select("id").eq("class_id", classId);

  if (teachers.length > 0) {
    const { error: teachersError } = await supabase
      .from("class_teachers")
      .insert(teacherRows(schoolId, classId, teachers));
    if (teachersError) {
      redirect(`/classes?edit=${classId}&error=${encodeURIComponent(`Enseignants non enregistrés : ${teachersError.message}`)}`);
    }
  }

  if (previous?.length) {
    await supabase
      .from("class_teachers")
      .delete()
      .in("id", previous.map((t) => t.id));
  }

  revalidatePath("/classes");
  redirect("/classes");
}

export async function deleteClass(formData) {
  const membership = await getCurrentMembership();
  const schoolId = membership.school.id;
  const supabase = await createClient();

  const classId = formData.get("classId")?.toString();
  if (!classId) redirect("/classes");

  const [{ data: klass }, { count: enrolled }] = await Promise.all([
    supabase.from("classes").select("name").eq("id", classId).eq("school_id", schoolId).maybeSingle(),
    supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("class_id", classId),
  ]);

  // enrollments.class_id is ON DELETE RESTRICT — say so up front rather
  // than surfacing a raw foreign-key error.
  if (enrolled) {
    redirect(
      `/classes?alert=${encodeURIComponent(
        `Impossible de supprimer ${klass?.name ? `« ${klass.name} »` : "cette classe"} : ${enrolled} inscription${enrolled > 1 ? "s" : ""} d'élève${enrolled > 1 ? "s" : ""} y ${enrolled > 1 ? "sont rattachées" : "est rattachée"}. Changez d'abord la classe de ces élèves.`,
      )}`,
    );
  }

  const { error } = await supabase.from("classes").delete().eq("id", classId).eq("school_id", schoolId);
  if (error) {
    redirect(`/classes?alert=${encodeURIComponent(`Suppression impossible : ${error.message}`)}`);
  }

  revalidatePath("/classes");
  redirect("/classes");
}
