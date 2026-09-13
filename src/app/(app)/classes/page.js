import Link from "next/link";
import { Users, GraduationCap, User, BookOpen, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { FormModal } from "@/components/layout/form-modal";
import { Button } from "@/components/ui/button";
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
import { createClass } from "./actions";

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
    { count: levelsCount },
    { data: teacherMemberships },
    { data: activeEnrollments },
    { data: levels },
    { data: schoolYears },
  ] = await Promise.all([
    supabase
      .from("classes")
      .select("id, name, capacity, levels(name, cycle), head_teacher:profiles(full_name)")
      .eq("school_id", schoolId)
      .order("name"),
    supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", schoolId).eq("status", "active"),
    supabase.from("levels").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
    supabase.from("memberships").select("user_id, profiles(full_name)").eq("school_id", schoolId).eq("role", "teacher"),
    supabase.from("enrollments").select("class_id").eq("school_id", schoolId).eq("status", "active"),
    supabase.from("levels").select("id, name, cycle").eq("school_id", schoolId).order("display_order"),
    supabase.from("school_years").select("id, label, is_current").eq("school_id", schoolId).order("start_date", { ascending: false }),
  ]);

  const enrollmentCountByClass = new Map();
  for (const { class_id } of activeEnrollments ?? []) {
    enrollmentCountByClass.set(class_id, (enrollmentCountByClass.get(class_id) ?? 0) + 1);
  }

  const currentYear = (schoolYears ?? []).find((y) => y.is_current) ?? schoolYears?.[0];

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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={GraduationCap} label="Total des classes" value={classes?.length ?? 0} accent="blue" />
        <StatCard icon={Users} label="Total des élèves" value={studentsCount ?? 0} accent="green" />
        <StatCard icon={User} label="Enseignants" value={teacherMemberships?.length ?? 0} accent="purple" />
        <StatCard icon={BookOpen} label="Niveaux scolaires" value={levelsCount ?? 0} accent="amber" />
      </div>

      <FormModal
        open={Boolean(params.new)}
        closeHref="/classes"
        title="Ajouter une classe"
        description={
          !currentYear || !(levels ?? []).length
            ? "Configurez d'abord au moins une année scolaire et un niveau dans Paramètres."
            : undefined
        }
        footer={
          currentYear && (levels ?? []).length ? (
            <>
              <Button type="submit" form="new-class-form">
                Créer la classe
              </Button>
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
              <Label htmlFor="capacity">Capacité (optionnel)</Label>
              <Input id="capacity" name="capacity" type="number" min="1" placeholder="30" />
            </div>
            <div className="space-y-2">
              <Label>Enseignant principal (optionnel)</Label>
              <Select name="headTeacherId">
                <SelectTrigger>
                  <SelectValue placeholder="Aucun" />
                </SelectTrigger>
                <SelectContent>
                  {(teacherMemberships ?? []).map((t) => (
                    <SelectItem key={t.user_id} value={t.user_id}>
                      {t.profiles?.full_name ?? "Sans nom"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {params.error ? <p className="text-sm text-destructive">{params.error}</p> : null}
          </form>
        ) : null}
      </FormModal>

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Classe</TableHead>
              <TableHead>Niveau</TableHead>
              <TableHead>Effectif</TableHead>
              <TableHead>Enseignant principal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(classes ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  Aucune classe pour le moment.
                </TableCell>
              </TableRow>
            ) : (
              classes.map((klass) => (
                <TableRow key={klass.id}>
                  <TableCell className="font-medium">{klass.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {CYCLE_LABELS[klass.levels?.cycle] ?? klass.levels?.name}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {enrollmentCountByClass.get(klass.id) ?? 0}
                    {klass.capacity ? ` / ${klass.capacity}` : ""}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {klass.head_teacher?.full_name ?? "—"}
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
