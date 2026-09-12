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
    <div className="flex min-h-screen">
      <Sidebar role={membership.role} unreadCount={unreadCount ?? 0} />
      <div className="flex flex-1 flex-col">
        <Header
          school={membership.school}
          role={membership.role}
          fullName={membership.fullName}
          notificationCount={unreadCount ?? 0}
        />
        <main className="flex-1 bg-secondary/30 p-6">{children}</main>
      </div>
    </div>
  );
}
