import { CreditCard, CheckCircle2, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSchoolsOverview } from "@/lib/platform-stats";
import { getPeriodRange, inPeriod } from "@/lib/period-filter";
import { PeriodFilter } from "@/components/layout/period-filter";
import { AdminStatCard } from "@/components/layout/admin-stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { markSubscriptionPaid } from "./actions";

export default async function AdminSubscriptionsPage({ searchParams }) {
  const params = await searchParams;
  const supabase = await createClient();
  let schools = await getSchoolsOverview(supabase);

  // Period filters by registration date (same as Établissements) — the
  // most well-defined "when did this row happen" field for a school.
  const range = getPeriodRange(params.period ?? "all");
  if (range.start) {
    schools = schools.filter((s) => inPeriod(s.created_at, range));
  }

  const active = schools.filter((s) => s.subscription.active);
  const expired = schools.filter((s) => !s.subscription.active);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Abonnements</h1>
          <p className="text-sm text-muted-foreground">Statut de l&apos;abonnement iziecole de chaque école.</p>
        </div>
        <PeriodFilter />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <AdminStatCard icon={CreditCard} label="Total établissements" value={schools.length} accent="blue" />
        <AdminStatCard icon={CheckCircle2} label="Abonnements actifs" value={active.length} accent="green" />
        <AdminStatCard icon={XCircle} label="Abonnements expirés" value={expired.length} accent="orange" />
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Établissement</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Renouvellement / expiration</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schools.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  Aucune école pour le moment.
                </TableCell>
              </TableRow>
            ) : (
              schools.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={s.subscription.active ? "bg-status-good/10 text-status-good" : "bg-status-critical/10 text-status-critical"}
                    >
                      {s.subscription.active ? "Actif" : "Expiré"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {s.subscription.expiresAt
                      ? `${s.subscription.active ? "Expire" : "A expiré"} le ${s.subscription.expiresAt.toLocaleDateString("fr-FR")}`
                      : "Aucun paiement enregistré"}
                  </TableCell>
                  <TableCell className="text-right">
                    <form action={markSubscriptionPaid}>
                      <input type="hidden" name="schoolId" value={s.id} />
                      <Button type="submit" variant="outline" size="sm">
                        Marquer payé
                      </Button>
                    </form>
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
