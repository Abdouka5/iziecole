"use server";

import { revalidatePath } from "next/cache";
import { getCurrentMembership } from "@/lib/school-context";
import { createClient } from "@/lib/supabase/server";
import { getPlatformSettings } from "@/lib/platform-settings";

function periodLabel(durationDays) {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + durationDays);
  const fmt = (d) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}

// For subscriptions settled outside PayTech (cash, bank transfer) — the
// super admin records it manually so the school's access unblocks.
export async function markSubscriptionPaid(formData) {
  const membership = await getCurrentMembership();
  if (membership.role !== "super_admin") return;

  const schoolId = formData.get("schoolId")?.toString();
  if (!schoolId) return;

  const supabase = await createClient();
  const { subscriptionPrice, subscriptionDurationDays } = await getPlatformSettings(supabase);

  const { data: school } = await supabase.from("schools").select("subscription_plan").eq("id", schoolId).maybeSingle();

  await supabase.from("subscription_payments").insert({
    school_id: schoolId,
    plan: school?.subscription_plan ?? "ecole_complete",
    amount: subscriptionPrice,
    period_label: periodLabel(subscriptionDurationDays),
    status: "paid",
    paid_at: new Date().toISOString(),
  });

  revalidatePath("/admin");
  revalidatePath("/admin/subscriptions");
  revalidatePath("/admin/schools");
}
