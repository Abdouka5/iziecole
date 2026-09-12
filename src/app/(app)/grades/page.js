import { FileText, BarChart3, Users2, Award, PenSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GradeFilters } from "./grade-filters";
import { saveGrades } from "./actions";

function studentAverages(grades) {
  const byStudent = new Map();
  for (const g of grades) {
    const coefficient = Number(g.class_subjects?.coefficient ?? 1);
    const normalized = (Number(g.score) / Number(g.max_score || 20)) * 20;
    const entry = byStudent.get(g.student_id) ?? { weighted: 0, coefficients: 0 };
    entry.weighted += normalized * coefficient;
    entry.coefficients += coefficient;
    byStudent.set(g.student_id, entry);
  }
  const averages = new Map();
  for (const [studentId, { weighted, coefficients }] of byStudent) {
    averages.set(studentId, coefficients > 0 ? weighted / coefficients : 0);
  }
  return averages;
}

export default async function GradesPage({ searchParams }) {
  const params = await searchParams;
  const membership = await getCurrentMembership();
  const supabase = await createClient();
  const schoolId = membership.school.id;

  const [{ data: classes }, { data: terms }, { data: allGrades }] = await Promise.all([
    supabase.from("classes").select("id, name").eq("school_id", schoolId).order("name"),
    supabase.from("terms").select("id, name, sequence").eq("school_id", schoolId).order("sequence"),
    supabase
      .from("grades")
      .select("student_id, score, max_score, class_subjects(coefficient, class_id, subjects(name))")
      .eq("school_id", schoolId),
  ]);

  const schoolAverages = studentAverages(allGrades ?? []);
  const overallAverage = schoolAverages.size
    ? [...schoolAverages.values()].reduce((a, b) => a + b, 0) / schoolAverages.size
    : 0;
  const strugglingCount = [...schoolAverages.values()].filter((avg) => avg < 10).length;
  const honorsCount = [...schoolAverages.values()].filter((avg) => avg >= 16).length;

  const classId = params.classId;
  const termId = params.termId;
  const classSubjectId = params.subjectId;

  const { data: classSubjectsRaw } = classId
    ? await supabase
        .from("class_subjects")
        .select("id, coefficient, subjects(name)")
        .eq("class_id", classId)
    : { data: [] };
  const subjectOptions = (classSubjectsRaw ?? []).map((cs) => ({
    classSubjectId: cs.id,
    name: cs.subjects?.name ?? "Matière",
  }));

  let roster = [];
  if (classId) {
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("student_id, students(id, first_name, last_name)")
      .eq("class_id", classId)
      .eq("status", "active");

    let existingGrades = [];
    if (classSubjectId && termId) {
      const { data } = await supabase
        .from("grades")
        .select("student_id, score")
        .eq("class_subject_id", classSubjectId)
        .eq("term_id", termId);
      existingGrades = data ?? [];
    }

    roster = (enrollments ?? [])
      .map((e) => ({
        id: e.students?.id,
        name: `${e.students?.first_name ?? ""} ${e.students?.last_name ?? ""}`.trim(),
        score: existingGrades.find((g) => g.student_id === e.students?.id)?.score ?? "",
      }))
      .filter((s) => !params.q || s.name.toLowerCase().includes(params.q.toLowerCase()));
  }

  // "Résultats par classe": every student in the class, averaged across
  // whichever subjects/terms already have grades.
  const classAverages = [];
  if (classId && allGrades) {
    const classGradeRows = allGrades.filter((g) => g.class_subjects?.class_id === classId);
    const averages = studentAverages(classGradeRows);
    for (const row of roster) {
      classAverages.push({ name: row.name, average: averages.get(row.id) ?? null });
    }
    classAverages.sort((a, b) => (b.average ?? -1) - (a.average ?? -1));
  }

  const subjectStats = new Map();
  for (const g of allGrades ?? []) {
    const name = g.class_subjects?.subjects?.name ?? "Autre";
    const normalized = (Number(g.score) / Number(g.max_score || 20)) * 20;
    const entry = subjectStats.get(name) ?? { total: 0, count: 0 };
    entry.total += normalized;
    entry.count += 1;
    subjectStats.set(name, entry);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notes & Bulletins"
        subtitle="Saisissez les notes, consultez les résultats et générez les bulletins."
        actions={
          <Button>
            <PenSquare className="mr-1.5 h-4 w-4" />
            Saisir des notes
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={FileText} label="Bulletins générés" value={0} accent="blue" />
        <StatCard icon={BarChart3} label="Moyenne générale" value={`${overallAverage.toFixed(1)} / 20`} accent="green" />
        <StatCard icon={Users2} label="Élèves en difficulté" value={strugglingCount} accent="amber" />
        <StatCard icon={Award} label="Mentions Très Bien" value={honorsCount} accent="purple" />
      </div>

      <GradeFilters classes={classes ?? []} terms={terms ?? []} subjects={subjectOptions} />

      <Tabs defaultValue="entry">
        <TabsList>
          <TabsTrigger value="entry">Saisie des notes</TabsTrigger>
          <TabsTrigger value="results">Résultats par classe</TabsTrigger>
          <TabsTrigger value="bulletins">Bulletins</TabsTrigger>
          <TabsTrigger value="stats">Statistiques</TabsTrigger>
        </TabsList>

        <TabsContent value="entry">
          {!classId || !classSubjectId || !termId ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Choisissez une classe, une matière et une période pour saisir les notes.
              </CardContent>
            </Card>
          ) : (
            <form action={saveGrades} className="overflow-hidden rounded-2xl border bg-card">
              <input type="hidden" name="classSubjectId" value={classSubjectId} />
              <input type="hidden" name="termId" value={termId} />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Élève</TableHead>
                    <TableHead className="w-32">Note / 20</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roster.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="py-10 text-center text-muted-foreground">
                        Aucun élève inscrit dans cette classe.
                      </TableCell>
                    </TableRow>
                  ) : (
                    roster.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.5"
                            min="0"
                            max="20"
                            name={`score_${s.id}`}
                            defaultValue={s.score}
                            className="w-20"
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {roster.length > 0 ? (
                <div className="flex justify-end border-t p-4">
                  <Button type="submit">Enregistrer les notes</Button>
                </div>
              ) : null}
            </form>
          )}
        </TabsContent>

        <TabsContent value="results">
          {!classId ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Choisissez une classe pour voir les résultats.
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-2xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rang</TableHead>
                    <TableHead>Élève</TableHead>
                    <TableHead>Moyenne</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classAverages.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                        Aucune note saisie pour cette classe.
                      </TableCell>
                    </TableRow>
                  ) : (
                    classAverages.map((row, i) => (
                      <TableRow key={row.name + i}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>{row.average != null ? `${row.average.toFixed(1)} / 20` : "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="bulletins">
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              La génération de bulletins PDF arrive bientôt.
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Moyenne par matière</CardTitle>
            </CardHeader>
            <CardContent>
              {subjectStats.size === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Aucune note enregistrée.</p>
              ) : (
                <ul className="space-y-2">
                  {[...subjectStats.entries()].map(([name, { total, count }]) => (
                    <li key={name} className="flex items-center justify-between text-sm">
                      <span>{name}</span>
                      <span className="font-medium">{(total / count).toFixed(1)} / 20</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
