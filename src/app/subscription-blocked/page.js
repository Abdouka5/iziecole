import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/school-context";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription-status";
import { getPlatformSettings } from "@/lib/platform-settings";
import { SubscriptionBlocked } from "@/components/layout/subscription-blocked";

// A dedicated, role-agnostic page (outside the (app) route group) so
// middleware can redirect here for ANY role without risking a loop —
// /settings itself redirects non-admins away, which would bounce a
// blocked cashier/teacher straight back. See middleware.js: it's the
// authoritative enforcement (runs on every navigation, including
// client-side ones the (app) layout's own pathname-based check can miss
// because Next reuses a cached layout render across sibling routes).
export default async function SubscriptionBlockedPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/select-school");
  if (membership.role === "super_admin") redirect("/admin");

  const supabase = await createClient();
  const [status, { subscriptionPrice, subscriptionDurationDays }] = await Promise.all([
    getSubscriptionStatus(supabase, membership.school.id),
    getPlatformSettings(supabase),
  ]);

  if (status.active) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 p-6">
      <SubscriptionBlocked
        canRenew={membership.role === "school_admin"}
        neverPaid={status.neverPaid}
        subscriptionPrice={subscriptionPrice}
        subscriptionDurationDays={subscriptionDurationDays}
      />
    </div>
  );
}
