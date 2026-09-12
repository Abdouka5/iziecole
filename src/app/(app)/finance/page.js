import {
  Wallet,
  PiggyBank,
  Clock,
  TrendingUp,
  Plus,
  FileOutput,
  Download,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GroupedBarChart } from "@/components/charts/grouped-bar-chart";
import { DonutChart } from "@/components/charts/donut-chart";

const MONTH_LABELS = [
  "Jan.", "Fév.", "Mars", "Avr.", "Mai", "Juin",
  "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc.",
];

const METHOD_LABELS = {
  especes: "Espèces",
  wave: "Wave",
  orange_money: "Orange Money",
  cheque: "Chèque",
  virement: "Virement",
};

function lastNMonthStarts(n) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1));
}

function fcfa(amount) {
  return `${Math.round(amount).toLocaleString("fr-FR")} FCFA`;
}

export default async function FinancePage() {
  const membership = await getCurrentMembership();
  const supabase = await createClient();
  const schoolId = membership.school.id;

  const [{ data: invoices }, { data: payments }] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, amount_due, due_date, status, students(first_name, last_name, enrollments(classes(name)))")
      .eq("school_id", schoolId),
    supabase
      .from("payments")
      .select("id, amount, method, paid_at, students(first_name, last_name)")
      .eq("school_id", schoolId)
      .order("paid_at", { ascending: false }),
  ]);

  const totalDue = (invoices ?? []).reduce((sum, i) => sum + Number(i.amount_due), 0);
  const totalPaid = (payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
  const remaining = Math.max(0, totalDue - totalPaid);
  const recoveryRate = totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0;

  const months = lastNMonthStarts(6);
  const evolutionData = months.map((monthStart) => {
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
    const label = MONTH_LABELS[monthStart.getMonth()];
    const encaisse = (payments ?? [])
      .filter((p) => new Date(p.paid_at) >= monthStart && new Date(p.paid_at) < monthEnd)
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const attendu = (invoices ?? [])
      .filter((i) => new Date(i.due_date) >= monthStart && new Date(i.due_date) < monthEnd)
      .reduce((sum, i) => sum + Number(i.amount_due), 0);
    return { month: label, encaisse, attendu };
  });
  const evolutionConfig = {
    encaisse: { label: "Montant encaissé", color: "var(--chart-2)" },
    attendu: { label: "Montant attendu", color: "var(--chart-1)" },
  };

  const methodTotals = {};
  for (const p of payments ?? []) {
    methodTotals[p.method] = (methodTotals[p.method] ?? 0) + Number(p.amount);
  }
  const methodEntries = Object.entries(methodTotals);
  const methodData = methodEntries.map(([method, value], i) => ({
    name: METHOD_LABELS[method] ?? method,
    value,
    fill: `var(--chart-${(i % 5) + 1})`,
  }));
  const methodConfig = Object.fromEntries(
    methodEntries.map(([method], i) => [
      METHOD_LABELS[method] ?? method,
      { label: METHOD_LABELS[method] ?? method, color: `var(--chart-${(i % 5) + 1})` },
    ]),
  );

  const overdueInvoices = (invoices ?? []).filter((i) => i.status === "overdue");

  const classTotals = new Map();
  for (const invoice of invoices ?? []) {
    const className = invoice.students?.enrollments?.[0]?.classes?.name ?? "Non affecté";
    const entry = classTotals.get(className) ?? { due: 0 };
    entry.due += Number(invoice.amount_due);
    classTotals.set(className, entry);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finances"
        subtitle="Suivez les paiements, gérez les frais de scolarité et consultez vos rapports financiers."
        actions={
          <>
            <Button variant="outline" disabled title="Bientôt disponible">
              <Plus className="mr-1.5 h-4 w-4" />
              Enregistrer un paiement
            </Button>
            <Button variant="outline" disabled title="Bientôt disponible">
              <FileOutput className="mr-1.5 h-4 w-4" />
              Générer une facture
            </Button>
            <Button variant="outline" disabled title="Bientôt disponible">
              <Download className="mr-1.5 h-4 w-4" />
              Exporter le rapport
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Wallet} label="Montant total attendu" value={fcfa(totalDue)} accent="blue" />
        <StatCard icon={PiggyBank} label="Montant encaissé" value={fcfa(totalPaid)} accent="green" />
        <StatCard icon={Clock} label="Reste à encaisser" value={fcfa(remaining)} accent="amber" />
        <StatCard icon={TrendingUp} label="Taux de recouvrement" value={`${recoveryRate}%`} accent="purple" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Évolution des paiements</CardTitle>
          </CardHeader>
          <CardContent>
            <GroupedBarChart data={evolutionData} config={evolutionConfig} series={["encaisse", "attendu"]} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Répartition par mode de paiement</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            {methodData.length > 0 ? (
              <>
                <DonutChart data={methodData} config={methodConfig} centerValue={fcfa(totalPaid)} />
                <ul className="w-full space-y-1.5 text-sm">
                  {methodData.map((m) => (
                    <li key={m.name} className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: m.fill }} />
                        {m.name}
                      </span>
                      <span className="font-medium">{fcfa(m.value)}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">Aucun paiement enregistré.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="recent">
        <TabsList>
          <TabsTrigger value="recent">Transactions récentes</TabsTrigger>
          <TabsTrigger value="overdue">Élèves en retard</TabsTrigger>
          <TabsTrigger value="byClass">Par classe</TabsTrigger>
          <TabsTrigger value="reports">Rapports</TabsTrigger>
        </TabsList>

        <TabsContent value="recent">
          <div className="overflow-x-auto rounded-2xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Élève</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Mode de paiement</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(payments ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                      Aucune transaction pour le moment.
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.slice(0, 20).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        {p.students?.first_name} {p.students?.last_name}
                      </TableCell>
                      <TableCell>{fcfa(Number(p.amount))}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{METHOD_LABELS[p.method] ?? p.method}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(p.paid_at).toLocaleDateString("fr-FR")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="overdue">
          <div className="overflow-x-auto rounded-2xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Élève</TableHead>
                  <TableHead>Montant dû</TableHead>
                  <TableHead>Échéance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdueInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                      Aucun retard de paiement.
                    </TableCell>
                  </TableRow>
                ) : (
                  overdueInvoices.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">
                        {i.students?.first_name} {i.students?.last_name}
                      </TableCell>
                      <TableCell>{fcfa(Number(i.amount_due))}</TableCell>
                      <TableCell className="text-status-critical">
                        {new Date(i.due_date).toLocaleDateString("fr-FR")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="byClass">
          <div className="overflow-x-auto rounded-2xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Classe</TableHead>
                  <TableHead>Montant attendu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classTotals.size === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="py-10 text-center text-muted-foreground">
                      Aucune donnée pour le moment.
                    </TableCell>
                  </TableRow>
                ) : (
                  [...classTotals.entries()].map(([className, { due }]) => (
                    <TableRow key={className}>
                      <TableCell className="font-medium">{className}</TableCell>
                      <TableCell>{fcfa(due)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Les rapports détaillés (export PDF/Excel) arrivent bientôt.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
