import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/school-context";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { AdminHeader } from "@/components/layout/admin-header";

export default async function AdminLayout({ children }) {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/login");
  if (membership.role !== "super_admin") redirect("/dashboard");

  return (
    <div className="flex h-screen overflow-hidden bg-secondary/30">
      <AdminSidebar fullName={membership.fullName} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminHeader fullName={membership.fullName} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
