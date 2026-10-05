import Link from "next/link";
import { UserPlus, UserCheck, Users, GraduationCap, Eye, Plus } from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { ExistingStudentCombobox } from "./existing-student-combobox";
import { enrollExistingStudent } from "./actions";

const GENDER_LABELS = { M: "Garçon", F: "Fille" };

// A front-desk workflow for registering students for the current school
// year — either brand new ones (same students row / createStudent action
// as "Nouvel élève" in Élèves) or already-existing ones just being
// affected to a class. Both are logged to enrollment_registrations, which
// is what this page's own history reads from — Élèves creates/edits
// students too, but that isn't this tool's work and shouldn't show here.
export default async function EnrollmentPage({ searchParams }) {
  const params = await searchParams;
  const membership = await getCurrentMembership();
  const supabase = await createClient();
  const schoolId = membership.school.id;

  const [{ data: classes }, { year }, { data: activeStudentsRaw }] = await Promise.all([
    supabase.from("classes").select("id, name").eq("school_id", schoolId).order("name"),
    getTermsForCurrentYear(supabase, schoolId),
    supabase
      .from("students")
      .select("id, first_name, last_name, matricule, enrollments(status, classes(name))")
      .eq("school_id", schoolId)
      .eq("status", "active")
      .order("first_name"),
  ]);

  const allStudents = (activeStudentsRaw ?? []).map((s) => ({
    id: s.id,
    first_name: s.first_name,
    last_name: s.last_name,
    matricule: s.matricule,
    className: s.enrollments?.find((e) => e.status === "active")?.classes?.name ?? null,
  }));

  let historyQuery = supabase
    .from("enrollment_registrations")
    .select("id, created_at, students(id, first_name, last_name, matricule, birth_date, gender), classes(id, name)")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });
  if (year?.id) historyQuery = historyQuery.eq("school_year_id", year.id);
  const { data: historyRaw } = await historyQuery;
  const history = (historyRaw ?? []).filter((r) => r.students);

  const uniqueStudents = new Map();
  for (const r of history) {
    if (!uniqueStudents.has(r.students.id)) uniqueStudents.set(r.students.id, r.students);
  }
  const boysCount = [...uniqueStudents.values()].filter((s) => s.gender === "M").length;
  const girlsCount = [...uniqueStudents.values()].filter((s) => s.gender === "F").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inscription"
        subtitle="Enregistrez un nouvel élève ou affectez un élève existant à une classe."
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="mr-1.5 h-4 w-4" />
                Nouvelle inscription
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/enrollment?new=1" className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Nouvel élève
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/enrollment?existing=1" className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  Élève existant
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Users} label="Total cette année" value={uniqueStudents.size} accent="blue" />
        <StatCard icon={GraduationCap} label="Garçons" value={boysCount} accent="purple" />
        <StatCard icon={GraduationCap} label="Filles" value={girlsCount} accent="pink" />
      </div>

      <FormModal
        open={Boolean(params.new)}
        closeHref="/enrollment"
        title="Nouvel élève"
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
          <input type="hidden" name="logRegistration" value="1" />
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

          {params.error && params.new ? <p className="text-sm text-destructive">{params.error}</p> : null}
        </form>
      </FormModal>

      <FormModal
        open={Boolean(params.existing)}
        closeHref="/enrollment"
        title="Élève existant"
        description="Affectez un élève déjà inscrit dans l'établissement à une classe pour cette année."
        className="sm:max-w-lg"
        footer={
          <>
            <ModalSubmitButton form="existing-enrollment-form" pendingText="Inscription...">
              <UserCheck className="mr-1.5 h-4 w-4" />
              Inscrire l&apos;élève
            </ModalSubmitButton>
            <Button variant="outline" asChild>
              <Link href="/enrollment">Annuler</Link>
            </Button>
          </>
        }
      >
        <form id="existing-enrollment-form" action={enrollExistingStudent} className="space-y-4 py-2">
          <FormPendingBridge />
          <input type="hidden" name="schoolYearId" value={year?.id ?? ""} />
          <div className="space-y-2">
            <Label>Élève</Label>
            <ExistingStudentCombobox students={allStudents} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="existingClassId">Classe</Label>
            <Select name="classId">
              <SelectTrigger id="existingClassId" className="w-full">
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
          {params.error && params.existing ? <p className="text-sm text-destructive">{params.error}</p> : null}
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
              history.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <p className="font-medium">
                      {r.students.first_name} {r.students.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">Mat. {r.students.matricule}</p>
                  </TableCell>
                  <TableCell>
                    {r.classes ? (
                      <Badge variant="secondary">{r.classes.name}</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">Non affecté</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {GENDER_LABELS[r.students.gender] ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.students.birth_date ? new Date(r.students.birth_date).toLocaleDateString("fr-FR") : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("fr-FR")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/students/${r.students.id}`} aria-label={`Afficher ${r.students.first_name} ${r.students.last_name}`}>
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
