import Link from "next/link";
import { Users, UserPlus, GraduationCap, Plus, Eye, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { FormModal } from "@/components/layout/form-modal";
import { Button } from "@/components/ui/button";
import { ModalSubmitButton } from "@/components/ui/modal-submit-button";
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
import { StudentFilters } from "./student-filters";
import { DeleteStudentButton } from "./delete-student-button";
import { GuardianFields } from "./guardian-fields";
import { BirthDateFields } from "./birth-date-fields";
import { createStudent, updateStudent } from "./actions";

const CYCLE_LABELS = {
  maternelle: "Maternelle",
  primaire: "Primaire",
  college: "Collège",
  lycee: "Lycée",
};

const STATUS_BADGE = {
  active: { label: "Actif", className: "bg-status-good/10 text-status-good" },
  transferred: { label: "Transféré", className: "bg-status-warning/10 text-status-warning" },
  graduated: { label: "Diplômé", className: "bg-primary/10 text-primary" },
  withdrawn: { label: "Retiré", className: "bg-status-critical/10 text-status-critical" },
};

export default async function StudentsPage({ searchParams }) {
  const params = await searchParams;
  const membership = await getCurrentMembership();
  const supabase = await createClient();
  const schoolId = membership.school.id;
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const [
    { count: totalStudents },
    { count: newThisMonth },
    { count: boysCount },
    { count: girlsCount },
    { data: classes },
  ] = await Promise.all([
    supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
    supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", schoolId).gte("created_at", startOfMonth),
    supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", schoolId).eq("gender", "M"),
    supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", schoolId).eq("gender", "F"),
    supabase.from("classes").select("id, name").eq("school_id", schoolId).order("name"),
  ]);

  let query = supabase
    .from("students")
    .select("id, first_name, last_name, matricule, birth_date, birth_place, address, gender, status, enrollments(classes(id, name, levels(cycle)))")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });

  if (params.q) {
    query = query.or(`first_name.ilike.%${params.q}%,last_name.ilike.%${params.q}%,matricule.ilike.%${params.q}%`);
  }
  if (params.status) query = query.eq("status", params.status);
  if (params.gender) query = query.eq("gender", params.gender);

  const { data: studentsRaw } = await query;

  let students = (studentsRaw ?? []).map((s) => ({
    ...s,
    class: s.enrollments?.[0]?.classes ?? null,
  }));

  if (params.classId) students = students.filter((s) => s.class?.id === params.classId);
  if (params.cycle) students = students.filter((s) => s.class?.levels?.cycle === params.cycle);

  const editingStudent = params.edit ? students.find((s) => s.id === params.edit) ?? null : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Élèves"
        subtitle="Gérez tous les élèves de votre établissement"
        actions={
          <Button asChild>
            <Link href="/students?new=1">
              <Plus className="mr-1.5 h-4 w-4" />
              Ajouter un élève
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Total élèves" value={totalStudents ?? 0} accent="blue" />
        <StatCard icon={UserPlus} label="Nouveaux inscrits" value={newThisMonth ?? 0} accent="green" trendLabel="ce mois-ci" />
        <StatCard icon={GraduationCap} label="Garçons" value={boysCount ?? 0} accent="purple" />
        <StatCard icon={GraduationCap} label="Filles" value={girlsCount ?? 0} accent="pink" />
      </div>

      <FormModal
        open={Boolean(params.new)}
        closeHref="/students"
        title="Nouvel élève"
        className="sm:max-w-2xl"
        footer={
          <>
            <ModalSubmitButton form="new-student-form" pendingText="Création...">
              Créer l&apos;élève
            </ModalSubmitButton>
            <Button variant="outline" asChild>
              <Link href="/students">Annuler</Link>
            </Button>
          </>
        }
      >
        <form id="new-student-form" action={createStudent} className="space-y-5 py-2">
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
                <SelectTrigger id="gender">
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
            <div className="space-y-2">
              <Label>Classe (optionnel)</Label>
              <Select name="classId">
                <SelectTrigger id="classId">
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

      {editingStudent ? (
        <FormModal
          open
          closeHref="/students"
          title="Modifier l'élève"
          className="sm:max-w-2xl"
          footer={
            <>
              <ModalSubmitButton form="edit-student-form" pendingText="Enregistrement...">
                Enregistrer les modifications
              </ModalSubmitButton>
              <Button variant="outline" asChild>
                <Link href="/students">Annuler</Link>
              </Button>
            </>
          }
        >
          <form id="edit-student-form" action={updateStudent} className="space-y-5 py-2">
            <input type="hidden" name="studentId" value={editingStudent.id} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="editFirstName">Prénom</Label>
                <Input id="editFirstName" name="firstName" defaultValue={editingStudent.first_name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editLastName">Nom</Label>
                <Input id="editLastName" name="lastName" defaultValue={editingStudent.last_name} required />
              </div>
              <div className="space-y-2">
                <Label>Date de naissance</Label>
                <BirthDateFields defaultValue={editingStudent.birth_date ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editBirthPlace">Lieu de naissance</Label>
                <Input id="editBirthPlace" name="birthPlace" defaultValue={editingStudent.birth_place ?? ""} placeholder="Dakar" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editGender">Genre</Label>
                <Select name="gender" defaultValue={editingStudent.gender ?? undefined}>
                  <SelectTrigger id="editGender">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Garçon</SelectItem>
                    <SelectItem value="F">Fille</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editAddress">Adresse</Label>
                <Input id="editAddress" name="address" defaultValue={editingStudent.address ?? ""} placeholder="Quartier, ville" />
              </div>
              <div className="space-y-2">
                <Label>Classe</Label>
                <Select name="classId" defaultValue={editingStudent.class?.id ?? undefined}>
                  <SelectTrigger id="editClassId">
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
            {params.error ? <p className="text-sm text-destructive">{params.error}</p> : null}
          </form>
        </FormModal>
      ) : null}

      <StudentFilters classes={classes ?? []} />

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Élève</TableHead>
              <TableHead>Classe</TableHead>
              <TableHead>Niveau</TableHead>
              <TableHead>Date de naissance</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Aucun élève ne correspond à ces filtres.
                </TableCell>
              </TableRow>
            ) : (
              students.map((s) => {
                const badge = STATUS_BADGE[s.status] ?? STATUS_BADGE.active;
                return (
                  <TableRow key={s.id}>
                    <TableCell>
                      <p className="font-medium">{s.first_name} {s.last_name}</p>
                      <p className="text-xs text-muted-foreground">Mat. {s.matricule}</p>
                    </TableCell>
                    <TableCell>
                      {s.class ? (
                        <Badge variant="secondary">{s.class.name}</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">Non affecté</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {s.class?.levels?.cycle ? CYCLE_LABELS[s.class.levels.cycle] : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {s.birth_date ? new Date(s.birth_date).toLocaleDateString("fr-FR") : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={badge.className} variant="secondary">
                        {badge.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/students/${s.id}`} aria-label={`Afficher ${s.first_name} ${s.last_name}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/students?edit=${s.id}`} aria-label={`Modifier ${s.first_name} ${s.last_name}`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <DeleteStudentButton studentId={s.id} studentName={`${s.first_name} ${s.last_name}`} />
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
  );
}
