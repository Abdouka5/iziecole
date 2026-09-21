import Link from "next/link";
import { Users, GraduationCap, User, Plus, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { FormModal } from "@/components/layout/form-modal";
import { Button } from "@/components/ui/button";
import { ModalSubmitButton } from "@/components/ui/modal-submit-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { createClass, updateClass } from "./actions";
import { TeacherFields } from "./teacher-fields";
import { DeleteClassButton } from "./delete-class-button";

const CYCLE_LABELS = {
  maternelle: "Maternelle",
  primaire: "Primaire",
  college: "Collège",
  lycee: "Lycée",
};

export default async function ClassesPage({ searchParams }) {
  const params = await searchParams;
  const membership = await getCurrentMembership();
  const supabase = await createClient();
  const schoolId = membership.school.id;

  const [
    { data: classes },
    { count: studentsCount },
    { data: teacherMemberships },
    { data: activeEnrollments },
    { data: levels },
    { data: schoolYears },
    { data: classTeachers },
  ] = await Promise.all([
    supabase
      .from("classes")
      .select("id, name, monthly_fee, level_id, levels(name, cycle), head_teacher:profiles(full_name)")
      .eq("school_id", schoolId)
      .order("name"),
    supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", schoolId).eq("status", "active"),
    supabase.from("memberships").select("user_id, profiles(full_name)").eq("school_id", schoolId).eq("role", "teacher"),
    supabase.from("enrollments").select("class_id").eq("school_id", schoolId).eq("status", "active"),
    supabase.from("levels").select("id, name, cycle").eq("school_id", schoolId).order("display_order"),
    supabase.from("school_years").select("id, label, is_current").eq("school_id", schoolId).order("start_date", { ascending: false }),
    // Separate from the classes query on purpose: if the class_teachers
    // migration hasn't been applied yet this just comes back empty instead
    // of taking the whole classes list down with it.
    supabase.from("class_teachers").select("class_id, full_name, phone").eq("school_id", schoolId).order("sort_order"),
  ]);

  const enrollmentCountByClass = new Map();
  for (const { class_id } of activeEnrollments ?? []) {
    enrollmentCountByClass.set(class_id, (enrollmentCountByClass.get(class_id) ?? 0) + 1);
  }

  const teachersByClass = new Map();
  for (const t of classTeachers ?? []) {
    const list = teachersByClass.get(t.class_id) ?? [];
    list.push(t);
    teachersByClass.set(t.class_id, list);
  }
  // The same person can teach several classes — count them once.
  const distinctTypedTeachers = new Set(
    (classTeachers ?? []).map((t) => `${t.full_name.trim().toLowerCase()}|${(t.phone ?? "").replace(/\D/g, "")}`),
  );
  const teacherCount = (teacherMemberships?.length ?? 0) + distinctTypedTeachers.size;

  const currentYear = (schoolYears ?? []).find((y) => y.is_current) ?? schoolYears?.[0];
  const editingClass = params.edit ? (classes ?? []).find((c) => c.id === params.edit) ?? null : null;
  const isAdmin = membership.role === "school_admin" || membership.role === "super_admin";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classes"
        subtitle="Gérez les classes de votre établissement"
        actions={
          <Button asChild>
            <Link href="/classes?new=1">
              <Plus className="mr-1.5 h-4 w-4" />
              Ajouter une classe
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={GraduationCap} label="Total des classes" value={classes?.length ?? 0} accent="blue" />
        <StatCard icon={Users} label="Total des élèves" value={studentsCount ?? 0} accent="green" />
        <StatCard icon={User} label="Enseignants" value={teacherCount} accent="purple" />
      </div>

      {params.alert ? (
        <Card className="border-status-warning/30 bg-status-warning/5">
          <CardContent className="py-4 text-sm">{params.alert}</CardContent>
        </Card>
      ) : null}

      <FormModal
        open={Boolean(params.new)}
        closeHref="/classes"
        title="Ajouter une classe"
        className="sm:max-w-2xl"
        description={
          !currentYear || !(levels ?? []).length
            ? "Configurez d'abord au moins une année scolaire et un niveau dans Paramètres."
            : undefined
        }
        footer={
          currentYear && (levels ?? []).length ? (
            <>
              <ModalSubmitButton form="new-class-form" pendingText="Création...">
                Créer la classe
              </ModalSubmitButton>
              <Button variant="outline" asChild>
                <Link href="/classes">Annuler</Link>
              </Button>
            </>
          ) : (
            <Button variant="outline" asChild>
              <Link href="/settings?section=levels">Aller dans Paramètres</Link>
            </Button>
          )
        }
      >
        {currentYear && (levels ?? []).length ? (
          <form id="new-class-form" className="space-y-4 py-2" action={createClass}>
            <input type="hidden" name="schoolYearId" value={currentYear.id} />
            <div className="space-y-2">
              <Label htmlFor="className">Nom de la classe</Label>
              <Input id="className" name="name" placeholder="6ème A" required />
            </div>
            <div className="space-y-2">
              <Label>Niveau</Label>
              <Select name="levelId" required>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un niveau" />
                </SelectTrigger>
                <SelectContent>
                  {(levels ?? []).map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name} — {CYCLE_LABELS[l.cycle] ?? l.cycle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthlyFee">Frais mensualité (FCFA, optionnel)</Label>
              <Input id="monthlyFee" name="monthlyFee" type="number" min="0" step="1" placeholder="25000" />
            </div>
            <div className="space-y-2">
              <Label>Enseignants (optionnel)</Label>
              <TeacherFields />
            </div>
            {params.error ? <p className="text-sm text-destructive">{params.error}</p> : null}
          </form>
        ) : null}
      </FormModal>

      {editingClass ? (
        <FormModal
          open
          closeHref="/classes"
          title="Modifier la classe"
          className="sm:max-w-2xl"
          footer={
            <>
              <ModalSubmitButton form="edit-class-form" pendingText="Enregistrement...">
                Enregistrer les modifications
              </ModalSubmitButton>
              <Button variant="outline" asChild>
                <Link href="/classes">Annuler</Link>
              </Button>
            </>
          }
        >
          <form id="edit-class-form" className="space-y-4 py-2" action={updateClass}>
            <input type="hidden" name="classId" value={editingClass.id} />
            <div className="space-y-2">
              <Label htmlFor="editClassName">Nom de la classe</Label>
              <Input id="editClassName" name="name" defaultValue={editingClass.name} required />
            </div>
            <div className="space-y-2">
              <Label>Niveau</Label>
              <Select name="levelId" defaultValue={editingClass.level_id} required>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un niveau" />
                </SelectTrigger>
                <SelectContent>
                  {(levels ?? []).map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name} — {CYCLE_LABELS[l.cycle] ?? l.cycle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editMonthlyFee">Frais mensualité (FCFA, optionnel)</Label>
              <Input
                id="editMonthlyFee"
                name="monthlyFee"
                type="number"
                min="0"
                step="1"
                defaultValue={editingClass.monthly_fee != null ? Math.round(Number(editingClass.monthly_fee)) : ""}
                placeholder="25000"
              />
            </div>
            <div className="space-y-2">
              <Label>Enseignants (optionnel)</Label>
              <TeacherFields initialTeachers={teachersByClass.get(editingClass.id) ?? []} />
            </div>
            {params.error ? <p className="text-sm text-destructive">{params.error}</p> : null}
          </form>
        </FormModal>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Classe</TableHead>
              <TableHead className="w-[1%] whitespace-nowrap">Niveau</TableHead>
              <TableHead className="w-[1%] whitespace-nowrap">Effectif</TableHead>
              <TableHead className="w-[1%] whitespace-nowrap">Frais mensuel</TableHead>
              <TableHead>Enseignants</TableHead>
              {isAdmin ? <TableHead className="w-[1%] whitespace-nowrap text-right">Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {(classes ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 6 : 5} className="py-10 text-center text-muted-foreground">
                  Aucune classe pour le moment.
                </TableCell>
              </TableRow>
            ) : (
              classes.map((klass) => {
                const teachers = [
                  // Classes that already had a head teacher picked from the old form keep showing it.
                  ...(klass.head_teacher?.full_name ? [{ full_name: klass.head_teacher.full_name, phone: null }] : []),
                  ...(teachersByClass.get(klass.id) ?? []),
                ];
                return (
                  <TableRow key={klass.id}>
                    <TableCell className="font-medium">{klass.name}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Badge variant="secondary">
                        {CYCLE_LABELS[klass.levels?.cycle] ?? klass.levels?.name}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{enrollmentCountByClass.get(klass.id) ?? 0}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {klass.monthly_fee ? `${Math.round(Number(klass.monthly_fee)).toLocaleString("fr-FR")} FCFA` : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {teachers.length ? (
                        <ul className="space-y-0.5">
                          {teachers.map((t, i) => (
                            <li key={i}>
                              <span className="text-foreground">{t.full_name}</span>
                              {t.phone ? <span> · {t.phone}</span> : null}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    {isAdmin ? (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/classes?edit=${klass.id}`} aria-label={`Modifier ${klass.name}`}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                          <DeleteClassButton classId={klass.id} classLabel={klass.name} />
                        </div>
                      </TableCell>
                    ) : null}
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
