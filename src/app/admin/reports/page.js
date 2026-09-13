import { Wallet, Building2, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatFcfa } from "@/lib/subscription-plans";
import { AdminStatCard } from "@/components/layout/admin-stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GroupedBarChart } from "@/components/charts/grouped-bar-chart";
import { ExportRevenueButton } from "./export-revenue-button";

const MONTH_LABELS = [
  "Jan.", "Fév.", "Mars", "Avr.", "Mai", "Juin",
  "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc.",
];

function monthBounds(offset) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 1);
  return { start, end };
}

export default async function AdminReportsPage() {
  const supabase = await createClient();
  const [{ data: payments }, { count: schoolsCount }, { count: studentsCount }] = await Promise.all([
    supabase
      .from("subscription_payments")
      .select("id, amount, paid_at, period_label, schools(name)")
      .eq("status", "paid")
      .order("paid_at", { ascending: false }),
    supabase.from("schools").select("id", { count: "exact", head: true }),
    supabase.from("students").select("id", { count: "exact", head: true }),
  ]);

  const total = (payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);

  const months = Array.from({ length: 6 }, (_, i) => monthBounds(5 - i));
  const revenueData = months.map(({ start, end }) => ({
    month: MONTH_LABELS[start.getMonth()],
    revenus: (payments ?? [])
      .filter((p) => new Date(p.paid_at) >= start && new Date(p.paid_at) < end)
      .reduce((sum, p) => sum + Number(p.amount), 0),
  }));
  const revenueConfig = { revenus: { label: "Revenus", color: "#22c55e" } };

  const paymentRows = (payments ?? []).map((p) => ({
    schoolName: p.schools?.name ?? "",
    periodLabel: p.period_label,
    dateLabel: new Date(p.paid_at).toLocaleDateString("fr-FR"),
    amount: Number(p.amount),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Rapports</h1>
          <p className="text-sm text-muted-foreground">Vue d&apos;ensemble des revenus de la plateforme.</p>
        </div>
        <ExportRevenueButton payments={paymentRows} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <AdminStatCard icon={Wallet} label="Revenus totaux" value={formatFcfa(total)} accent="blue" />
        <AdminStatCard icon={Building2} label="Établissements" value={schoolsCount ?? 0} accent="purple" />
        <AdminStatCard icon={Users} label="Élèves (toutes écoles)" value={studentsCount ?? 0} accent="green" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenus des 6 derniers mois</CardTitle>
        </CardHeader>
        <CardContent>
          <GroupedBarChart data={revenueData} config={revenueConfig} series={["revenus"]} />
        </CardContent>
      </Card>
    </div>
  );
}
