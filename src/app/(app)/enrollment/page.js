import Link from "next/link";
import { UserPlus, Users, GraduationCap, Eye, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";
import { getTermsForCurrentYear } from "@/lib/school-defaults";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { FormModal } from "@/components/layout/form-modal";
import { Button } from "@/components/ui/button";
import { ModalSubmitButton } from "@/components/ui/modal-submit-button";
import { FormPendingBridge } from "@/components/ui/form-pending-bridge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { GuardianFields } from "@/app/(app)/students/guardian-fields";
import { BirthDateFields } from "@/app/(app)/students/birth-date-fields";
import { createStudent } from "@/app/(app)/students/actions";

const GENDER_LABELS = { M: "Garçon", F: "Fille" };

// A front-desk workflow for enrolling students one after another (same
// students row / createStudent action as "Nouvel élève" in Élèves — a
// student registered here shows up there immediately too), with its own
// history: every student created since the start of the current school
// year, whether or not a class was picked for them at the time.
export default async function EnrollmentPage({ searchParams }) {
  const params = await searchParams;
  const membership = await getCurrentMembership();
  const supabase = await createClient();
  const schoolId = membership.school.id;

  const [{ data: classes }, { year }] = await Promise.all([
    supabase.from("classes").select("id, name").eq("school_id", schoolId).order("name"),
    getTermsForCurrentYear(supabase, schoolId),
  ]);

  let historyQuery = supabase
    .from("students")
    .select("id, first_name, last_name, matricule, birth_date, gender, created_at, enrollments(status, classes(id, name))")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });
  if (year?.start_date) historyQuery = historyQuery.gte("created_at", year.start_date);
  const { data: historyRaw } = await historyQuery;

  const history = (historyRaw ?? []).map((s) => ({
    ...s,
    class: s.enrollments?.find((e) => e.status === "active")?.classes ?? s.enrollments?.[0]?.classes ?? null,
  }));
  const boysCount = history.filter((s) => s.gender === "M").length;
  const girlsCount = history.filter((s) => s.gender === "F").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inscription"
        subtitle="Enregistrez un nouvel élève et affectez-le à une classe."
        actions={
          <Button asChild>
            <Link href="/enrollment?new=1">
              <Plus className="mr-1.5 h-4 w-4" />
              Nouvelle inscription
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Users} label="Total cette année" value={history.length} accent="blue" />
        <StatCard icon={GraduationCap} label="Garçons" value={boysCount} accent="purple" />
        <StatCard icon={GraduationCap} label="Filles" value={girlsCount} accent="pink" />
      </div>

      <FormModal
        open={Boolean(params.new)}
        closeHref="/enrollment"
        title="Nouvelle inscription"
        description="Enregistrez un nouvel élève et affectez-le à une classe."
        className="sm:max-w-2xl"
        footer={
          <>
            <ModalSubmitButton form="new-enrollment-form" pendingText="Inscription...">
              <UserPlus className="mr-1.5 h-4 w-4" />
              Inscrire l&apos;élève
            </ModalSubmitButton>
            <Button variant="outline" asChild>
              <Link href="/enrollment">Annuler</Link>
            </Button>
          </>
        }
      >
        <form id="new-enrollment-form" action={createStudent} className="space-y-5 py-2">
          <FormPendingBridge />
          <input type="hidden" name="successPath" value="/enrollment" />
          <input type="hidden" name="errorPath" value="/enrollment?new=1" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">Prénom</Label>
              <Input id="firstName" name="firstName" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nom</Label>
              <Input id="lastName" name="lastName" required />
            </div>
            <div className="space-y-2">
              <Label>Date de naissance</Label>
              <BirthDateFields />
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthPlace">Lieu de naissance</Label>
              <Input id="birthPlace" name="birthPlace" placeholder="Dakar" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Genre</Label>
              <Select name="gender">
                <SelectTrigger id="gender" className="w-full">
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Garçon</SelectItem>
                  <SelectItem value="F">Fille</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Adresse</Label>
              <Input id="address" name="address" placeholder="Quartier, ville" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="classId">Classe (optionnel)</Label>
              <Select name="classId">
                <SelectTrigger id="classId" className="w-full">
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {(classes ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Parents / Responsables</Label>
            <GuardianFields />
          </div>

          {params.error ? <p className="text-sm text-destructive">{params.error}</p> : null}
        </form>
      </FormModal>

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Élève</TableHead>
              <TableHead>Classe</TableHead>
              <TableHead>Genre</TableHead>
              <TableHead>Date de naissance</TableHead>
              <TableHead>Date d&apos;inscription</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Aucune inscription cette année pour le moment.
                </TableCell>
              </TableRow>
            ) : (
              history.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <p className="font-medium">
                      {s.first_name} {s.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">Mat. {s.matricule}</p>
                  </TableCell>
                  <TableCell>
                    {s.class ? (
                      <Badge variant="secondary">{s.class.name}</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">Non affecté</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{GENDER_LABELS[s.gender] ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {s.birth_date ? new Date(s.birth_date).toLocaleDateString("fr-FR") : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(s.created_at).toLocaleDateString("fr-FR")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/students/${s.id}`} aria-label={`Afficher ${s.first_name} ${s.last_name}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
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
