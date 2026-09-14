"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";
import { datesFromLabel } from "@/lib/school-year-dates";

export async function createFirstSchoolYear(formData) {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/login");

  const label = formData.get("label")?.toString().trim();
  if (!label) {
    redirect(`/signup/school-year?error=${encodeURIComponent("Le libellé est obligatoire.")}`);
  }
  const { startDate, endDate } = datesFromLabel(label);

  const supabase = await createClient();
  const { error } = await supabase.from("school_years").insert({
    school_id: membership.school.id,
    label,
    start_date: startDate,
    end_date: endDate,
    is_current: true,
  });

  if (error) {
    redirect(`/signup/school-year?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
