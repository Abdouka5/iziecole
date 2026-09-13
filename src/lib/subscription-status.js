import { SUBSCRIPTION_DURATION_DAYS } from "@/lib/subscription-plans";

// A school's subscription is active if its most recent *paid*
// subscription_payments row is less than 30 days old. No grace/trial
// period — a school with zero paid periods is blocked immediately (the
// school_admin can still reach /settings to pay). See docs/decisions.md.
export async function getSubscriptionStatus(supabase, schoolId) {
  const { data: lastPaid } = await supabase
    .from("subscription_payments")
    .select("paid_at")
    .eq("school_id", schoolId)
    .eq("status", "paid")
    .order("paid_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lastPaid?.paid_at) {
    return { active: false, expiresAt: null, daysRemaining: 0 };
  }

  const expiresAt = new Date(lastPaid.paid_at);
  expiresAt.setDate(expiresAt.getDate() + SUBSCRIPTION_DURATION_DAYS);

  const msRemaining = expiresAt.getTime() - Date.now();
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

  return { active: msRemaining > 0, expiresAt, daysRemaining };
}
