import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getCurrentMembership } from "@/lib/school-context";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription-status";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { SubscriptionBlocked } from "@/components/layout/subscription-blocked";
import { SetupBanner } from "@/components/layout/setup-banner";

export default async function AppLayout({ children }) {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/select-school");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { count: unreadCount } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", user.id)
    .is("read_at", null);

  const pathname = (await headers()).get("x-pathname") ?? "";
  const isSettingsPage = pathname.startsWith("/settings");

  let blocked = false;
  if (membership.role !== "super_admin" && !isSettingsPage) {
    const { active } = await getSubscriptionStatus(supabase, membership.school.id);
    blocked = !active;
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
          {needsSetup ? <SetupBanner /> : null}
          <Header
            school={membership.school}
            role={membership.role}
            fullName={membership.fullName}
            notificationCount={unreadCount ?? 0}
          />
        </div>
        <main className="flex-1 overflow-y-auto bg-secondary/30 p-6 print:overflow-visible print:bg-white print:p-0">
          {blocked ? <SubscriptionBlocked canRenew={membership.role === "school_admin"} /> : children}
        </main>
      </div>
    </div>
  );
}
