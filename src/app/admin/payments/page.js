import { Wallet, TrendingUp, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatFcfa } from "@/lib/subscription-plans";
import { getPeriodRange, inPeriod, PERIOD_OPTIONS } from "@/lib/period-filter";
import { PeriodFilter } from "@/components/layout/period-filter";
import { AdminStatCard } from "@/components/layout/admin-stat-card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_LABELS = {
  pending: "En attente",
  paid: "Payé",
  failed: "Échoué",
  cancelled: "Annulé",
};

const STATUS_BADGE = {
  pending: "bg-status-warning/10 text-status-warning",
  paid: "bg-status-good/10 text-status-good",
  failed: "bg-status-critical/10 text-status-critical",
  cancelled: "bg-muted text-muted-foreground",
};

export default async function AdminPaymentsPage({ searchParams }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: allPayments } = await supabase
    .from("subscription_payments")
    .select("id, amount, status, period_label, paid_at, created_at, schools(name)")
    .order("created_at", { ascending: false });

  const period = params.period ?? "all";
  const range = getPeriodRange(period, params.from, params.to);
  const payments = range.start
    ? (allPayments ?? []).filter((p) => inPeriod(p.paid_at ?? p.created_at, range))
    : allPayments ?? [];

  const paid = payments.filter((p) => p.status === "paid");
  const totalRevenue = paid.reduce((sum, p) => sum + Number(p.amount), 0);
  const pendingCount = payments.filter((p) => p.status === "pending").length;
  const revenueLabel = period === "all" ? "Revenus totaux" : `Revenus (${PERIOD_OPTIONS.find((o) => o.value === period)?.label.toLowerCase()})`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Paiements</h1>
          <p className="text-sm text-muted-foreground">Historique des paiements d&apos;abonnement de toutes les écoles.</p>
        </div>
        <PeriodFilter />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <AdminStatCard icon={Wallet} label={revenueLabel} value={formatFcfa(totalRevenue)} accent="blue" />
        <AdminStatCard icon={TrendingUp} label="Nombre de paiements" value={paid.length} accent="green" />
        <AdminStatCard icon={Clock} label="Paiements en attente" value={pendingCount} accent="orange" />
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>École</TableHead>
              <TableHead>Période</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  Aucun paiement pour le moment.
                </TableCell>
              </TableRow>
            ) : (
              payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.schools?.name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.period_label}</TableCell>
                  <TableCell>{formatFcfa(Number(p.amount))}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={STATUS_BADGE[p.status]}>
                      {STATUS_LABELS[p.status] ?? p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(p.paid_at ?? p.created_at).toLocaleDateString("fr-FR")}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
