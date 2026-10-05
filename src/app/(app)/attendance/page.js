import Link from "next/link";
import { UserX, Clock, AlertCircle, Plus, Printer, PartyPopper } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";
import { describePeriod, filterByPeriod } from "@/lib/period-filter";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { PeriodFilter } from "@/components/layout/period-filter";
import { FormModal } from "@/components/layout/form-modal";
import { Button } from "@/components/ui/button";
import { ModalSubmitButton } from "@/components/ui/modal-submit-button";
import { FormPendingBridge } from "@/components/ui/form-pending-bridge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StudentCombobox } from "./student-combobox";
import { AttendanceFilters } from "./attendance-filters";
import { DeleteAttendanceButton } from "./delete-attendance-button";
import { createAttendance, toggleJustified } from "./actions";

const TYPE_LABELS = { absence: "Absence", retard: "Retard" };
const PAGE_SIZE = 30;

export default async function AttendancePage({ searchParams }) {
  const params = await searchParams;
  const membership = await getCurrentMembership();
  const supabase = await createClient();
  const schoolId = membership.school.id;
  const isAdmin = membership.role === "school_admin";

  const [{ data: classes }, { data: students }, { data: records }] = await Promise.all([
    supabase.from("classes").select("id, name").eq("school_id", schoolId).order("name"),
    supabase
      .from("students")
      .select("id, first_name, last_name, matricule, enrollments(status, classes(id, name))")
      .eq("school_id", schoolId)
      .eq("status", "active")
      .order("first_name"),
    supabase
      .from("attendance_records")
      .select(
        "id, type, occurred_on, reason, justified, class_id, students(first_name, last_name, matricule), classes(name)",
      )
      .eq("school_id", schoolId)
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  const studentOptions = (students ?? []).map((s) => {
    const enrollment = s.enrollments?.find((e) => e.status === "active") ?? s.enrollments?.[0];
    return {
      id: s.id,
      first_name: s.first_name,
      last_name: s.last_name,
      matricule: s.matricule,
      classId: enrollment?.classes?.id ?? null,
      className: enrollment?.classes?.name ?? null,
    };
  });

  const classId = params.classId;
  const type = params.type;
  const periodFilter = { period: params.period ?? "all", from: params.from, to: params.to };
  const periodLabel = describePeriod(periodFilter.period, periodFilter.from, periodFilter.to);

  let filteredRecords = filterByPeriod(records ?? [], (r) => r.occurred_on, periodFilter);
  if (classId) filteredRecords = filteredRecords.filter((r) => r.class_id === classId);
  if (type) filteredRecords = filteredRecords.filter((r) => r.type === type);

  const absenceCount = filteredRecords.filter((r) => r.type === "absence").length;
  const lateCount = filteredRecords.filter((r) => r.type === "retard").length;
  const unjustifiedCount = filteredRecords.filter((r) => !r.justified).length;

  const pageCount = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(params.page) || 1), pageCount);
  const pagedRecords = filteredRecords.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  function pageHref(targetPage) {
    const sp = new URLSearchParams(
      Object.entries(params).filter(([k]) => !["new", "error", "ticket", "page"].includes(k)),
    );
    if (targetPage > 1) sp.set("page", String(targetPage));
    return `/attendance?${sp.toString()}`;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Absences / Retards"
        subtitle="Enregistrez les absences et retards, et imprimez le billet correspondant."
        actions={
          <Button asChild>
            <Link href="/attendance?new=1">
              <Plus className="mr-1.5 h-4 w-4" />
              Ajouter
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={UserX} label="Absences" value={absenceCount} accent="amber" />
        <StatCard icon={Clock} label="Retards" value={lateCount} accent="purple" />
        <StatCard icon={AlertCircle} label="Non justifiés" value={unjustifiedCount} accent="pink" />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4">
        <PeriodFilter />
        <AttendanceFilters classes={classes ?? []} />
      </div>

      <FormModal
        open={Boolean(params.new)}
        closeHref="/attendance"
        title="Ajouter une absence ou un retard"
        className="sm:max-w-lg"
        footer={
          <>
            <ModalSubmitButton form="new-attendance-form" pendingText="Enregistrement...">
              Enregistrer
            </ModalSubmitButton>
            <Button variant="outline" asChild>
              <Link href="/attendance">Annuler</Link>
            </Button>
          </>
        }
      >
        <form id="new-attendance-form" action={createAttendance} className="space-y-4 py-2">
          <FormPendingBridge />
          <div className="space-y-2">
            <Label>Élève</Label>
            <StudentCombobox students={studentOptions} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select name="type" required>
                <SelectTrigger id="type" className="w-full">
                  <SelectValue placeholder="Choisir" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="absence">Absence</SelectItem>
                  <SelectItem value="retard">Retard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="occurredOn">Date</Label>
              <Input
                id="occurredOn"
                name="occurredOn"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Raison (optionnel)</Label>
            <Input id="reason" name="reason" placeholder="Rendez-vous médical, retard de bus..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="justified">Justifié</Label>
            <Select name="justified" defaultValue="non">
              <SelectTrigger id="justified" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="non">Non</SelectItem>
                <SelectItem value="oui">Oui</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {params.error ? <p className="text-sm text-destructive">{params.error}</p> : null}
        </form>
      </FormModal>

      <FormModal
        open={Boolean(params.ticket)}
        closeHref="/attendance"
        title="Enregistré"
        footer={
          <>
            <Button asChild>
              <Link href={`/billet/${params.ticket}`} target="_blank">
                <Printer className="mr-1.5 h-4 w-4" />
                Imprimer le billet
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/attendance">Fermer</Link>
            </Button>
          </>
        }
      >
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <PartyPopper className="h-8 w-8 text-status-good" />
          <p className="text-sm text-muted-foreground">
            Enregistré. Le billet s&apos;ouvre dans un nouvel onglet et lance
            automatiquement l&apos;impression (imprimante thermique 80mm ou
            classique).
          </p>
        </div>
      </FormModal>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {periodLabel} · {filteredRecords.length} enregistrement{filteredRecords.length > 1 ? "s" : ""}
          </p>
          {pageCount > 1 ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} asChild={page > 1}>
                {page > 1 ? <Link href={pageHref(page - 1)}>Précédent</Link> : <span>Précédent</span>}
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {page} / {pageCount}
              </span>
              <Button variant="outline" size="sm" disabled={page >= pageCount} asChild={page < pageCount}>
                {page < pageCount ? <Link href={pageHref(page + 1)}>Suivant</Link> : <span>Suivant</span>}
              </Button>
            </div>
          ) : null}
        </div>

        <div className="overflow-x-auto rounded-2xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Élève</TableHead>
                <TableHead>Classe</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Raison</TableHead>
                <TableHead>Justifié</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    Aucun enregistrement pour le moment.
                  </TableCell>
                </TableRow>
              ) : (
                pagedRecords.map((r) => {
                  const studentName = `${r.students?.first_name ?? ""} ${r.students?.last_name ?? ""}`.trim();
                  const justifiedBadge = (
                    <Badge
                      variant="secondary"
                      className={r.justified ? "bg-status-good/10 text-status-good" : "bg-status-warning/10 text-status-warning"}
                    >
                      {r.justified ? "Justifié" : "Non justifié"}
                    </Badge>
                  );
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{studentName}</TableCell>
                      <TableCell className="text-muted-foreground">{r.classes?.name ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={r.type === "absence" ? "bg-status-critical/10 text-status-critical" : "bg-primary/10 text-primary"}>
                          {TYPE_LABELS[r.type] ?? r.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(r.occurred_on).toLocaleDateString("fr-FR")}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{r.reason ?? "—"}</TableCell>
                      <TableCell>
                        {isAdmin ? (
                          <form action={toggleJustified}>
                            <input type="hidden" name="recordId" value={r.id} />
                            <input type="hidden" name="justified" value={(!r.justified).toString()} />
                            <button type="submit" className="cursor-pointer">
                              {justifiedBadge}
                            </button>
                          </form>
                        ) : (
                          justifiedBadge
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/billet/${r.id}`} target="_blank" aria-label={`Imprimer le billet de ${studentName}`}>
                              <Printer className="h-4 w-4" />
                            </Link>
                          </Button>
                          {isAdmin ? <DeleteAttendanceButton recordId={r.id} studentName={studentName} /> : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
