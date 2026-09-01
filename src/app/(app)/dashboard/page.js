import { Users, GraduationCap, Wallet, CalendarClock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function StatCard({ icon: Icon, label, value }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <Icon className="h-4 w-4 text-brand-blue" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-heading font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const membership = await getCurrentMembership();
  const supabase = await createClient();
  const schoolId = membership.school.id;

  const [{ count: studentsCount }, { count: classesCount }, { count: pendingInvoices }] =
    await Promise.all([
      supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId)
        .eq("status", "active"),
      supabase
        .from("classes")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId),
      supabase
        .from("invoices")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId)
        .in("status", ["pending", "partial", "overdue"]),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-heading font-semibold text-brand-ink">
          Bonjour{membership.fullName ? `, ${membership.fullName}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">{membership.school.name}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Élèves actifs" value={studentsCount ?? 0} />
        <StatCard icon={GraduationCap} label="Classes" value={classesCount ?? 0} />
        <StatCard icon={Wallet} label="Factures en attente" value={pendingInvoices ?? 0} />
        <StatCard icon={CalendarClock} label="Année scolaire" value="2025-2026" />
      </div>
    </div>
  );
}
