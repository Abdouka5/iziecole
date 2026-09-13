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

  // The school name/logo also appear in the shared app layout (header,
  // sidebar) and on printed documents — revalidate the whole layout tree,
  // not just this path, so the change is visible everywhere on first save.
  revalidatePath("/", "layout");
  redirect("/settings?section=general");
}

// The form only asks for a label ("2025-2026") — dates are derived from it
// (September 1 -> August 31) rather than shown as separate fields, since
// that's the school year everywhere in Senegal anyway.
function datesFromLabel(label) {
  const match = /^(\d{4})\D+(\d{4})$/.exec(label);
  if (match) {
    const [, startYear, endYear] = match;
    return { startDate: `${startYear}-09-01`, endDate: `${endYear}-08-31` };
  }
  const year = new Date().getFullYear();
  return { startDate: `${year}-09-01`, endDate: `${year + 1}-08-31` };
}

export async function createSchoolYear(formData) {
  const membership = await getCurrentMembership();
  const supabase = await createClient();

  const label = formData.get("label")?.toString().trim();
  if (!label) {
    redirect(`/settings?section=year&error=${encodeURIComponent("Le libellé est obligatoire.")}`);
  }
  const { startDate, endDate } = datesFromLabel(label);

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
