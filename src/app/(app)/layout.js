import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/school-context";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

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

  return (
    <div className="flex h-screen overflow-hidden print:block print:h-auto print:overflow-visible">
      <div className="print:hidden">
        <Sidebar role={membership.role} />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden print:block print:overflow-visible">
        <div className="print:hidden">
          <Header
            school={membership.school}
            role={membership.role}
            fullName={membership.fullName}
            notificationCount={unreadCount ?? 0}
          />
        </div>
        <main className="flex-1 overflow-y-auto bg-secondary/30 p-6 print:overflow-visible print:bg-white print:p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
