import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getCurrentMembership } from "@/lib/school-context";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription-status";
import { getPlatformSettings } from "@/lib/platform-settings";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { SubscriptionBlocked } from "@/components/layout/subscription-blocked";
import { SetupBanner } from "@/components/layout/setup-banner";
import { PlatformAnnouncementBanner } from "@/components/layout/platform-announcement-banner";

export default async function AppLayout({ children }) {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/select-school");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ count: unreadCount }, { data: latestAnnouncement }] = await Promise.all([
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .is("read_at", null),
    supabase
      .from("platform_announcements")
      .select("id, title, body")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const pathname = (await headers()).get("x-pathname") ?? "";
  const isSettingsPage = pathname.startsWith("/settings");
  const isExemptPage = isSettingsPage || pathname.startsWith("/support");

  let blocked = false;
  let subscriptionPrice, subscriptionDurationDays;
  if (membership.role !== "super_admin" && !isExemptPage) {
    const [{ active }, platformSettings] = await Promise.all([
      getSubscriptionStatus(supabase, membership.school.id),
      getPlatformSettings(supabase),
    ]);
    blocked = !active;
    subscriptionPrice = platformSettings.subscriptionPrice;
    subscriptionDurationDays = platformSettings.subscriptionDurationDays;
  }

  const needsSetup =
    membership.role === "school_admin" &&
    !isSettingsPage &&
    (!membership.school.address || !membership.school.phone);

  return (
    <div className="flex h-screen overflow-hidden print:block print:h-auto print:overflow-visible">
      <div className="print:hidden">
        <Sidebar role={membership.role} />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden print:block print:overflow-visible">
        <div className="print:hidden">
          {latestAnnouncement ? <PlatformAnnouncementBanner announcement={latestAnnouncement} /> : null}
          {needsSetup ? <SetupBanner /> : null}
          <Header
            school={membership.school}
            role={membership.role}
            fullName={membership.fullName}
            notificationCount={unreadCount ?? 0}
          />
        </div>
        <main className="flex-1 overflow-y-auto bg-secondary/30 p-6 print:overflow-visible print:bg-white print:p-0">
          {blocked ? (
            <SubscriptionBlocked
              canRenew={membership.role === "school_admin"}
              subscriptionPrice={subscriptionPrice}
              subscriptionDurationDays={subscriptionDurationDays}
            />
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
