"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentMembership } from "@/lib/school-context";
import { createClient } from "@/lib/supabase/server";

export async function updatePlatformSettings(formData) {
  const membership = await getCurrentMembership();
  if (membership.role !== "super_admin") redirect("/dashboard");

  const price = Number(formData.get("subscriptionPrice"));
  const durationDays = Number(formData.get("subscriptionDurationDays"));

  if (!price || price <= 0 || !durationDays || durationDays <= 0) {
    redirect(`/admin/plans?error=${encodeURIComponent("Le prix et la durée doivent être supérieurs à zéro.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("platform_settings")
    .update({
      subscription_price: price,
      subscription_duration_days: durationDays,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) {
    redirect(`/admin/plans?error=${encodeURIComponent(error.message)}`);
  }

  // Every page that displays or charges this price reads it live from
  // platform_settings, but revalidate the ones most likely already cached.
  revalidatePath("/", "layout");
  redirect("/admin/plans?saved=1");
}
