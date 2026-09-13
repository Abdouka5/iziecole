import { Wallet, TrendingUp, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatFcfa } from "@/lib/subscription-plans";
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

export default async function AdminPaymentsPage() {
  const supabase = await createClient();
  const { data: payments } = await supabase
    .from("subscription_payments")
    .select("id, amount, status, period_label, paid_at, created_at, schools(name)")
    .order("created_at", { ascending: false });

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const paid = (payments ?? []).filter((p) => p.status === "paid");
  const totalRevenue = paid.reduce((sum, p) => sum + Number(p.amount), 0);
  const revenueThisMonth = paid
    .filter((p) => new Date(p.paid_at) >= startOfMonth)
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const pendingCount = (payments ?? []).filter((p) => p.status === "pending").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Paiements</h1>
        <p className="text-sm text-muted-foreground">Historique des paiements d&apos;abonnement de toutes les écoles.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <AdminStatCard icon={Wallet} label="Revenus totaux" value={formatFcfa(totalRevenue)} accent="blue" />
        <AdminStatCard icon={TrendingUp} label="Revenus ce mois-ci" value={formatFcfa(revenueThisMonth)} accent="green" />
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
            {(payments ?? []).length === 0 ? (
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
