import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/school-context";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default async function AppLayout({ children }) {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/select-school");

  return (
    <div className="flex min-h-screen">
      <Sidebar role={membership.role} />
      <div className="flex flex-1 flex-col">
        <Header
          school={membership.school}
          role={membership.role}
          fullName={membership.fullName}
        />
        <main className="flex-1 bg-secondary/30 p-6">{children}</main>
      </div>
    </div>
  );
}
