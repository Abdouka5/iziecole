import { Users, GraduationCap, User, BookOpen, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";
import { StatCard } from "@/components/layout/stat-card";
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

const CYCLE_LABELS = {
  maternelle: "Maternelle",
  primaire: "Primaire",
  college: "Collège",
  lycee: "Lycée",
};

export default async function ClassesPage() {
  const membership = await getCurrentMembership();
  const supabase = await createClient();
  const schoolId = membership.school.id;

  const [
    { data: classes },
    { count: studentsCount },
    { count: levelsCount },
    { data: teacherMemberships },
    { data: activeEnrollments },
  ] = await Promise.all([
    supabase
      .from("classes")
      .select("id, name, capacity, levels(name, cycle), head_teacher:profiles(full_name)")
      .eq("school_id", schoolId)
      .order("name"),
    supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", schoolId).eq("status", "active"),
    supabase.from("levels").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
    supabase.from("memberships").select("user_id").eq("school_id", schoolId).eq("role", "teacher"),
    supabase.from("enrollments").select("class_id").eq("school_id", schoolId).eq("status", "active"),
  ]);

  const enrollmentCountByClass = new Map();
  for (const { class_id } of activeEnrollments ?? []) {
    enrollmentCountByClass.set(class_id, (enrollmentCountByClass.get(class_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold text-brand-ink">Classes</h1>
          <p className="text-sm text-muted-foreground">
            Gérez les classes de votre établissement
          </p>
        </div>
        <Button>
          <Plus className="mr-1.5 h-4 w-4" />
          Ajouter une classe
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={GraduationCap} label="Total des classes" value={classes?.length ?? 0} accent="blue" />
        <StatCard icon={Users} label="Total des élèves" value={studentsCount ?? 0} accent="green" />
        <StatCard icon={User} label="Enseignants" value={teacherMemberships?.length ?? 0} accent="purple" />
        <StatCard icon={BookOpen} label="Niveaux scolaires" value={levelsCount ?? 0} accent="amber" />
      </div>

      <div className="rounded-lg border bg-card">
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
