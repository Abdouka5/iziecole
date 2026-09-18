import Link from "next/link";
import {
  PiggyBank,
  Receipt,
  Scale,
  Plus,
  Printer,
  Download,
  PartyPopper,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";
import { calculateAge } from "@/lib/time";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { FormModal } from "@/components/layout/form-modal";
import { Button } from "@/components/ui/button";
import { ModalSubmitButton } from "@/components/ui/modal-submit-button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { StudentCombobox } from "./student-combobox";
import { ExportReportButton } from "./export-report-button";
import { recordPayment, createExpense, deleteExpense, deletePayment } from "./actions";

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

export default async function FinancePage({ searchParams }) {
  const params = await searchParams;
  const membership = await getCurrentMembership();
  const supabase = await createClient();
  const schoolId = membership.school.id;

  const [{ data: invoices }, { data: payments }, { data: students }, { data: expenses }] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, amount_due, due_date, status, students(first_name, last_name, enrollments(classes(name)))")
      .eq("school_id", schoolId),
    supabase
      .from("payments")
      .select("id, amount, method, paid_at, students(first_name, last_name, matricule)")
      .eq("school_id", schoolId)
      .order("paid_at", { ascending: false }),
    supabase
      .from("students")
      .select("id, first_name, last_name, matricule, birth_date, enrollments(classes(name))")
      .eq("school_id", schoolId)
      .eq("status", "active")
      .order("first_name"),
    supabase
      .from("expenses")
      .select("id, label, amount, expense_date")
      .eq("school_id", schoolId)
      .order("expense_date", { ascending: false }),
  ]);

  const isAdmin = membership.role === "school_admin";

  const studentOptions = (students ?? []).map((s) => ({
    id: s.id,
    first_name: s.first_name,
    last_name: s.last_name,
    matricule: s.matricule,
    className: s.enrollments?.[0]?.classes?.name ?? null,
    age: calculateAge(s.birth_date),
  }));

  const totalDue = (invoices ?? []).reduce((sum, i) => sum + Number(i.amount_due), 0);
  const totalPaid = (payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
  const totalExpenses = (expenses ?? []).reduce((sum, e) => sum + Number(e.amount), 0);
  const balance = totalPaid - totalExpenses;

  const months = lastNMonthStarts(6);
  const evolutionData = months.map((monthStart) => {
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
    const label = MONTH_LABELS[monthStart.getMonth()];
    const encaisse = (payments ?? [])
      .filter((p) => new Date(p.paid_at) >= monthStart && new Date(p.paid_at) < monthEnd)
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const depenses = (expenses ?? [])
      .filter((e) => new Date(e.expense_date) >= monthStart && new Date(e.expense_date) < monthEnd)
      .reduce((sum, e) => sum + Number(e.amount), 0);
    return { month: label, encaisse, depenses };
  });
  const evolutionConfig = {
    encaisse: { label: "Montant encaissé", color: "var(--chart-2)" },
    depenses: { label: "Dépenses", color: "var(--chart-4)" },
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

  const paymentRows = (payments ?? []).map((p) => ({
    studentName: `${p.students?.first_name ?? ""} ${p.students?.last_name ?? ""}`.trim(),
    matricule: p.students?.matricule ?? "",
    methodLabel: METHOD_LABELS[p.method] ?? p.method,
    dateLabel: new Date(p.paid_at).toLocaleDateString("fr-FR"),
    amount: Number(p.amount),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finances"
        subtitle="Suivez les paiements, gérez les frais de scolarité et consultez vos rapports financiers."
        actions={
          <>
            <Button asChild>
              <Link href="/finance?newPayment=1">
                <Plus className="mr-1.5 h-4 w-4" />
                Ajouter un paiement
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/finance?newExpense=1">
                <Receipt className="mr-1.5 h-4 w-4" />
                Ajouter une dépense
              </Link>
            </Button>
            <ExportReportButton payments={paymentRows} />
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={PiggyBank} label="Montant encaissé" value={fcfa(totalPaid)} accent="green" />
        <StatCard icon={Receipt} label="Dépenses" value={fcfa(totalExpenses)} accent="amber" />
        <StatCard icon={Scale} label="Solde" value={fcfa(balance)} accent="purple" />
      </div>

      <FormModal
        open={Boolean(params.newPayment)}
        closeHref="/finance"
        title="Ajouter un paiement"
        description="Un reçu imprimable (format thermique) sera proposé une fois le paiement enregistré."
        footer={
          <>
            <ModalSubmitButton form="new-payment-form" pendingText="Enregistrement...">
              Enregistrer le paiement
            </ModalSubmitButton>
            <Button variant="outline" asChild>
              <Link href="/finance">Annuler</Link>
            </Button>
          </>
        }
      >
        <form id="new-payment-form" action={recordPayment} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Élève</Label>
            <StudentCombobox students={studentOptions} name="studentId" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount">Montant (FCFA)</Label>
              <Input id="amount" name="amount" type="number" min="1" step="1" required />
            </div>
            <div className="space-y-2">
              <Label>Mode de paiement</Label>
              <Select name="method" required>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="especes">Espèces</SelectItem>
                  <SelectItem value="wave">Wave</SelectItem>
                  <SelectItem value="orange_money">Orange Money</SelectItem>
                  <SelectItem value="cheque">Chèque</SelectItem>
                  <SelectItem value="virement">Virement</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="periodDate">Période</Label>
            <Input
              id="periodDate"
              name="periodDate"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              required
            />
          </div>
          {params.error ? <p className="text-sm text-destructive">{params.error}</p> : null}
        </form>
      </FormModal>

      <FormModal
        open={Boolean(params.receipt)}
        closeHref="/finance"
        title="Paiement enregistré"
        footer={
          <>
            <Button asChild>
              <Link href={`/receipt/${params.receipt}`} target="_blank">
                <Printer className="mr-1.5 h-4 w-4" />
                Imprimer le reçu
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/finance">Fermer</Link>
            </Button>
          </>
        }
      >
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <PartyPopper className="h-8 w-8 text-status-good" />
          <p className="text-sm text-muted-foreground">
            Le paiement a bien été enregistré. Le reçu s&apos;ouvre dans un nouvel
            onglet et lance automatiquement l&apos;impression (imprimante
            thermique 58/80mm ou classique).
          </p>
        </div>
      </FormModal>

      <FormModal
        open={Boolean(params.newExpense)}
        closeHref="/finance"
        title="Ajouter une dépense"
        description="Enregistrez une dépense de fonctionnement (salaires, fournitures, entretien...)."
        footer={
          <>
            <ModalSubmitButton form="new-expense-form" pendingText="Enregistrement...">
              Enregistrer la dépense
            </ModalSubmitButton>
            <Button variant="outline" asChild>
              <Link href="/finance">Annuler</Link>
            </Button>
          </>
        }
      >
        <form id="new-expense-form" action={createExpense} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="label">Libellé</Label>
            <Input id="label" name="label" placeholder="Achat fournitures" required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="expenseAmount">Montant (FCFA)</Label>
              <Input id="expenseAmount" name="amount" type="number" min="1" step="1" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expenseDate">Date</Label>
              <Input
                id="expenseDate"
                name="expenseDate"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                required
              />
            </div>
          </div>
          {params.error ? <p className="text-sm text-destructive">{params.error}</p> : null}
        </form>
      </FormModal>

      <Tabs defaultValue="recent">
        <TabsList>
          <TabsTrigger value="recent">Transactions récentes</TabsTrigger>
          <TabsTrigger value="expenses">Dépenses</TabsTrigger>
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
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(payments ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
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
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/receipt/${p.id}?download=1`} target="_blank" aria-label="Télécharger le reçu">
                              <Download className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/receipt/${p.id}`} target="_blank" aria-label="Imprimer le reçu">
                              <Printer className="h-4 w-4" />
                            </Link>
                          </Button>
                          {isAdmin ? (
                            <form
                              action={deletePayment}
                              onSubmit={(e) => {
                                if (!confirm("Supprimer ce paiement ? Cette action est irréversible.")) {
                                  e.preventDefault();
                                }
                              }}
                            >
                              <input type="hidden" name="paymentId" value={p.id} />
                              <Button
                                type="submit"
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                aria-label="Supprimer le paiement"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </form>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="expenses">
          <div className="overflow-x-auto rounded-2xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Libellé</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Date</TableHead>
                  {isAdmin ? <TableHead className="text-right">Actions</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(expenses ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 4 : 3} className="py-10 text-center text-muted-foreground">
                      Aucune dépense enregistrée pour le moment.
                    </TableCell>
                  </TableRow>
                ) : (
                  expenses.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.label}</TableCell>
                      <TableCell>{fcfa(Number(e.amount))}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(e.expense_date).toLocaleDateString("fr-FR")}
                      </TableCell>
                      {isAdmin ? (
                        <TableCell className="text-right">
                          <form action={deleteExpense}>
                            <input type="hidden" name="expenseId" value={e.id} />
                            <Button type="submit" variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </form>
                        </TableCell>
                      ) : null}
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
              Utilisez le bouton « Exporter le rapport » en haut de la page pour
              télécharger l&apos;historique des paiements en PDF ou en Excel.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Encaissements et dépenses</CardTitle>
          </CardHeader>
          <CardContent>
            <GroupedBarChart data={evolutionData} config={evolutionConfig} series={["encaisse", "depenses"]} />
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
    </div>
  );
}
