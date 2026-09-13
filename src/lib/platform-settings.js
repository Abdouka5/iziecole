import { SUBSCRIPTION_PRICE, SUBSCRIPTION_DURATION_DAYS } from "@/lib/subscription-plans";

// The subscription price/duration is a single editable row (Plans &
// Tarifs, super admin only) rather than a hardcoded constant. Falls back
// to the code defaults if the row is somehow missing (fresh install
// before the seed insert in the migration has run).
export async function getPlatformSettings(supabase) {
  const { data } = await supabase
    .from("platform_settings")
    .select("subscription_price, subscription_duration_days")
    .eq("id", 1)
    .maybeSingle();

  return {
    subscriptionPrice: data ? Number(data.subscription_price) : SUBSCRIPTION_PRICE,
    subscriptionDurationDays: data ? data.subscription_duration_days : SUBSCRIPTION_DURATION_DAYS,
  };
}
