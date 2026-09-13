"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";

export async function createClass(formData) {
  const membership = await getCurrentMembership();
  const schoolId = membership.school.id;
  const supabase = await createClient();

  const name = formData.get("name")?.toString().trim();
  const levelId = formData.get("levelId")?.toString();
  const schoolYearId = formData.get("schoolYearId")?.toString();
  const monthlyFee = formData.get("monthlyFee")?.toString();
  const headTeacherId = formData.get("headTeacherId")?.toString() || null;

  if (!name || !levelId || !schoolYearId) {
    redirect(`/classes?new=1&error=${encodeURIComponent("Nom, niveau et année scolaire sont obligatoires.")}`);
  }

  const { error } = await supabase.from("classes").insert({
    school_id: schoolId,
    school_year_id: schoolYearId,
    level_id: levelId,
    name,
    monthly_fee: monthlyFee ? Number(monthlyFee) : null,
    head_teacher_id: headTeacherId,
  });

  if (error) {
    redirect(`/classes?new=1&error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/classes");
  redirect("/classes");
}
