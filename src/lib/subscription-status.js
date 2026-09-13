import { getPlatformSettings } from "@/lib/platform-settings";

// A school's subscription is active if its most recent *paid*
// subscription_payments row is less than the platform's subscription
// duration old. No grace/trial period — a school with zero paid periods
// is blocked immediately (the school_admin can still reach /settings to
// pay). See docs/decisions.md.
export async function getSubscriptionStatus(supabase, schoolId) {
  const [{ data: lastPaid }, { subscriptionDurationDays }] = await Promise.all([
    supabase
      .from("subscription_payments")
      .select("paid_at")
      .eq("school_id", schoolId)
      .eq("status", "paid")
      .order("paid_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getPlatformSettings(supabase),
  ]);

  if (!lastPaid?.paid_at) {
    return { active: false, expiresAt: null, daysRemaining: 0 };
  }

  const expiresAt = new Date(lastPaid.paid_at);
  expiresAt.setDate(expiresAt.getDate() + subscriptionDurationDays);

  const msRemaining = expiresAt.getTime() - Date.now();
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

  return { active: msRemaining > 0, expiresAt, daysRemaining };
}
