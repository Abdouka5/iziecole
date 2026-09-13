"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";

export async function updateSchoolInfo(formData) {
  const membership = await getCurrentMembership();
  const supabase = await createClient();

  await supabase
    .from("schools")
    .update({
      name: formData.get("name")?.toString().trim(),
      address: formData.get("address")?.toString().trim() || null,
      phone: formData.get("phone")?.toString().trim() || null,
    })
    .eq("id", membership.school.id);

  revalidatePath("/settings");
  redirect("/settings?section=general");
}

export async function createSchoolYear(formData) {
  const membership = await getCurrentMembership();
  const supabase = await createClient();

  const label = formData.get("label")?.toString().trim();
  const startDate = formData.get("startDate")?.toString();
  const endDate = formData.get("endDate")?.toString();
  if (!label || !startDate || !endDate) {
    redirect(`/settings?section=year&error=${encodeURIComponent("Merci de remplir tous les champs.")}`);
  }

  const { error } = await supabase.from("school_years").insert({
    school_id: membership.school.id,
    label,
    start_date: startDate,
    end_date: endDate,
  });

  if (error) {
    redirect(`/settings?section=year&error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/settings");
  redirect("/settings?section=year");
}

export async function setCurrentSchoolYear(formData) {
  const membership = await getCurrentMembership();
  const supabase = await createClient();
  const yearId = formData.get("yearId")?.toString();
  if (!yearId) return;

  await supabase.from("school_years").update({ is_current: false }).eq("school_id", membership.school.id);
  await supabase.from("school_years").update({ is_current: true }).eq("id", yearId);

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  redirect("/settings?section=year");
}

export async function createLevel(formData) {
  const membership = await getCurrentMembership();
  const supabase = await createClient();

  const name = formData.get("name")?.toString().trim();
  const cycle = formData.get("cycle")?.toString();
  if (!name || !cycle) {
    redirect(`/settings?section=levels&error=${encodeURIComponent("Merci de remplir tous les champs.")}`);
  }

  const { count: existingCount } = await supabase
    .from("levels")
    .select("id", { count: "exact", head: true })
    .eq("school_id", membership.school.id);

  await supabase.from("levels").insert({
    school_id: membership.school.id,
    name,
    cycle,
    display_order: existingCount ?? 0,
  });

  revalidatePath("/settings");
  redirect("/settings?section=levels");
}

// Standard Senegalese school levels, Maternelle -> Terminale, grouped by the
// 4 cycles the app already prices by (see subscription-plans.js).
const DEFAULT_LEVELS = [
  { name: "Petite Section", cycle: "maternelle" },
  { name: "Moyenne Section", cycle: "maternelle" },
  { name: "Grande Section", cycle: "maternelle" },
  { name: "CI", cycle: "primaire" },
  { name: "CP", cycle: "primaire" },
  { name: "CE1", cycle: "primaire" },
  { name: "CE2", cycle: "primaire" },
  { name: "CM1", cycle: "primaire" },
  { name: "CM2", cycle: "primaire" },
  { name: "6ème", cycle: "college" },
  { name: "5ème", cycle: "college" },
  { name: "4ème", cycle: "college" },
  { name: "3ème", cycle: "college" },
  { name: "2nde", cycle: "lycee" },
  { name: "1ère L", cycle: "lycee" },
  { name: "1ère S", cycle: "lycee" },
  { name: "Terminale L", cycle: "lycee" },
  { name: "Terminale S", cycle: "lycee" },
];

export async function seedDefaultLevels() {
  const membership = await getCurrentMembership();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("levels")
    .select("name")
    .eq("school_id", membership.school.id);
  const existingNames = new Set((existing ?? []).map((l) => l.name));

  const toInsert = DEFAULT_LEVELS
    .filter((l) => !existingNames.has(l.name))
    .map((l, i) => ({
      school_id: membership.school.id,
      name: l.name,
      cycle: l.cycle,
      display_order: existingNames.size + i,
    }));

  if (toInsert.length > 0) {
    await supabase.from("levels").insert(toInsert);
  }

  revalidatePath("/settings");
  redirect("/settings?section=levels");
}

export async function createSubject(formData) {
  const membership = await getCurrentMembership();
  const supabase = await createClient();

  const name = formData.get("name")?.toString().trim();
  const code = formData.get("code")?.toString().trim() || null;
  if (!name) {
    redirect(`/settings?section=subjects&error=${encodeURIComponent("Le nom est obligatoire.")}`);
  }

  const { error } = await supabase.from("subjects").insert({
    school_id: membership.school.id,
    name,
    code,
  });

  if (error) {
    redirect(`/settings?section=subjects&error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/settings");
  redirect("/settings?section=subjects");
}

// Matières couramment enseignées au Sénégal, de l'élémentaire à la
// Terminale (séries L et S), telles que fournies par l'utilisateur.
const DEFAULT_SUBJECTS = [
  { name: "Français", code: "FR" },
  { name: "Mathématiques", code: "MATH" },
  { name: "Éducation scientifique et technologique" },
  { name: "Histoire", code: "HIST" },
  { name: "Géographie", code: "GEO" },
  { name: "Éducation civique et morale", code: "ECM" },
  { name: "Éducation artistique" },
  { name: "Éducation musicale" },
  { name: "Éducation physique et sportive", code: "EPS" },
  { name: "Langues nationales" },
  { name: "Arabe / Éducation religieuse" },
  { name: "Sciences de la Vie et de la Terre", code: "SVT" },
  { name: "Sciences physiques", code: "SP" },
  { name: "Anglais", code: "ANG" },
  { name: "Espagnol", code: "ESP" },
  { name: "Arabe", code: "AR" },
  { name: "Éducation civique", code: "EC" },
  { name: "Informatique / TIC" },
  { name: "Éducation religieuse" },
  { name: "Littérature", code: "LITT" },
  { name: "Philosophie", code: "PHILO" },
];

export async function seedDefaultSubjects() {
  const membership = await getCurrentMembership();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("subjects")
    .select("name")
    .eq("school_id", membership.school.id);
  const existingNames = new Set((existing ?? []).map((s) => s.name));

  const toInsert = DEFAULT_SUBJECTS
    .filter((s) => !existingNames.has(s.name))
    .map((s) => ({
      school_id: membership.school.id,
      name: s.name,
      code: s.code ?? null,
    }));

  if (toInsert.length > 0) {
    await supabase.from("subjects").insert(toInsert);
  }

  revalidatePath("/settings");
  redirect("/settings?section=subjects");
}
