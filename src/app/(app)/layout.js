import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getCurrentMembership } from "@/lib/school-context";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { SetupBanner } from "@/components/layout/setup-banner";
import { PlatformAnnouncementBanner } from "@/components/layout/platform-announcement-banner";

// Whether a school's subscription is active is checked in middleware, not
// here: middleware runs before every navigation (including client-side
// ones), while this layout can be reused across sibling routes without
// re-executing (see src/lib/supabase/middleware.js for the full story of
// why that made a check here alone unsafe). Duplicating the same two
// Supabase queries again on every render was also just wasted latency —
// keep this layout to what only it needs.
export default async function AppLayout({ children }) {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/select-school");
  if (membership.role === "super_admin" && !membership.school) redirect("/admin/schools");

  const supabase = await createClient();

  const { data: latestAnnouncement } = await supabase
    .from("platform_announcements")
    .select("id, title, body")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const pathname = (await headers()).get("x-pathname") ?? "";
  const isSettingsPage = pathname.startsWith("/settings");

  const needsSetup =
    membership.role === "school_admin" &&
    !isSettingsPage &&
    (!membership.school.address || !membership.school.phone);

  return (
    <div className="flex h-screen overflow-hidden print:block print:h-auto print:overflow-visible">
      <div className="print:hidden">
        <Sidebar role={membership.role} fullName={membership.fullName} />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden print:block print:overflow-visible">
        <div className="print:hidden">
          {latestAnnouncement ? <PlatformAnnouncementBanner announcement={latestAnnouncement} /> : null}
          {needsSetup ? <SetupBanner /> : null}
          <Header role={membership.role} fullName={membership.fullName} />
        </div>
        <main className="flex-1 overflow-y-auto bg-secondary/30 p-4 sm:p-6 print:overflow-visible print:bg-white print:p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
