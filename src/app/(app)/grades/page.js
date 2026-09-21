import Link from "next/link";
import { FileText, BarChart3, Users2, Award, PenSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";
import { getTermsForCurrentYear } from "@/lib/school-defaults";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { FormModal } from "@/components/layout/form-modal";
import { Button } from "@/components/ui/button";
import { ModalSubmitButton } from "@/components/ui/modal-submit-button";
import { FormPendingBridge } from "@/components/ui/form-pending-bridge";
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

// Accent- and case-insensitive, so "eleve" finds "Élève".
const normalize = (text) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export default async function GradesPage({ searchParams }) {
  const params = await searchParams;
  const membership = await getCurrentMembership();
  const supabase = await createClient();
  const schoolId = membership.school.id;

  const classId = params.classId;
  const termId = params.termId;
  const subjectId = params.subjectId;
  const search = params.q?.trim() ?? "";
  const entryOpen = Boolean(params.entry);

  const [{ data: classes }, { data: subjects }, { data: allGrades }, { terms }] = await Promise.all([
    supabase.from("classes").select("id, name").eq("school_id", schoolId).order("name"),
    supabase.from("subjects").select("id, name").eq("school_id", schoolId).order("name"),
    supabase
      .from("grades")
      .select("student_id, score, max_score, term_id, class_subjects(coefficient, class_id, subject_id, subjects(name))")
      .eq("school_id", schoolId),
    getTermsForCurrentYear(supabase, schoolId),
  ]);

  const selectedTerm = terms.find((t) => t.id === termId);
  const selectedSubject = (subjects ?? []).find((s) => s.id === subjectId);
  const selectedClass = (classes ?? []).find((c) => c.id === classId);

  // One filtered set drives the cards, the results table and the stats, so
  // the class / période / matière filters change everything on the page.
  const filteredGrades = (allGrades ?? []).filter(
    (g) =>
      (!classId || g.class_subjects?.class_id === classId) &&
      (!termId || g.term_id === termId) &&
      (!subjectId || g.class_subjects?.subject_id === subjectId),
  );

  const filteredAverages = studentAverages(filteredGrades);
  const overallAverage = filteredAverages.size
    ? [...filteredAverages.values()].reduce((a, b) => a + b, 0) / filteredAverages.size
    : 0;
  const strugglingCount = [...filteredAverages.values()].filter((avg) => avg < 10).length;
  const honorsCount = [...filteredAverages.values()].filter((avg) => avg >= 16).length;

  const entryHrefParams = new URLSearchParams(
    Object.entries(params).filter(([k]) => !["entry", "saved", "entryError"].includes(k)),
  );
  entryHrefParams.set("entry", "1");
  const closeEntryParams = new URLSearchParams(
    Object.entries(params).filter(([k]) => !["entry", "saved", "entryError"].includes(k)),
  );

  let fullRoster = [];
  if (classId) {
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("student_id, students(id, first_name, last_name)")
      .eq("class_id", classId)
      .eq("status", "active");
    fullRoster = (enrollments ?? [])
      .filter((e) => e.students?.id)
      .map((e) => ({
        id: e.students.id,
        name: `${e.students.first_name ?? ""} ${e.students.last_name ?? ""}`.trim(),
      }));
  }
  const matchesSearch = (name) => !search || normalize(name).includes(normalize(search));

  // Rank is among the whole class (only students who have a grade in the
  // current filter), and searching only narrows what is displayed.
  const ranked = fullRoster
    .map((s) => ({ ...s, average: filteredAverages.get(s.id) ?? null }))
    .sort((a, b) => (b.average ?? -1) - (a.average ?? -1));
  let nextRank = 1;
  for (const row of ranked) row.rank = row.average != null ? nextRank++ : null;
  const resultRows = ranked.filter((r) => matchesSearch(r.name));

  const readyToEnter = Boolean(classId && subjectId && termId);
  const existingScores = new Map();
  if (readyToEnter) {
    for (const g of allGrades ?? []) {
      if (
        g.term_id === termId &&
        g.class_subjects?.class_id === classId &&
        g.class_subjects?.subject_id === subjectId
      ) {
        existingScores.set(g.student_id, g.score);
      }
    }
  }
  const entryRoster = fullRoster
    .filter((s) => matchesSearch(s.name))
    .map((s) => ({ ...s, score: existingScores.get(s.id) ?? "" }));

  const subjectStats = new Map();
  for (const g of filteredGrades) {
    const name = g.class_subjects?.subjects?.name ?? "Autre";
    const normalized = (Number(g.score) / Number(g.max_score || 20)) * 20;
    const entry = subjectStats.get(name) ?? { total: 0, count: 0 };
    entry.total += normalized;
    entry.count += 1;
    subjectStats.set(name, entry);
  }

  const filterSummary = [
    selectedClass ? selectedClass.name : "Toutes les classes",
    selectedTerm ? selectedTerm.name : "Toutes les périodes",
    selectedSubject ? selectedSubject.name : "Toutes les matières",
  ].join(" · ");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notes & Bulletins"
        subtitle="Saisissez les notes, consultez les résultats et générez les bulletins."
        actions={
          <Button asChild>
            <Link href={`/grades?${entryHrefParams.toString()}`}>
              <PenSquare className="mr-1.5 h-4 w-4" />
              Saisir des notes
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={FileText} label="Bulletins générés" value={0} accent="blue" />
        <StatCard icon={BarChart3} label="Moyenne générale" value={`${overallAverage.toFixed(1)} / 20`} accent="green" />
        <StatCard icon={Users2} label="Élèves en difficulté" value={strugglingCount} accent="amber" />
        <StatCard icon={Award} label="Mentions Très Bien" value={honorsCount} accent="purple" />
      </div>

      <GradeFilters classes={classes ?? []} terms={terms} subjects={subjects ?? []} />

      {params.saved ? (
        <Card className="border-status-good/30 bg-status-good/5">
          <CardContent className="py-3 text-sm">Notes enregistrées.</CardContent>
        </Card>
      ) : null}

      <FormModal
        open={entryOpen}
        closeHref={`/grades?${closeEntryParams.toString()}`}
        title="Saisir des notes"
        description={
          readyToEnter
            ? `${selectedClass?.name} · ${selectedSubject?.name} · ${selectedTerm?.name}`
            : "Choisissez une classe, une matière et une période dans les filtres ci-dessus, puis cliquez à nouveau sur «Saisir des notes»."
        }
        className="sm:max-w-xl"
        footer={
          readyToEnter && entryRoster.length > 0 ? (
            <>
              <ModalSubmitButton form="grades-entry-form" pendingText="Enregistrement...">
                Enregistrer les notes
              </ModalSubmitButton>
              <Button variant="outline" asChild>
                <Link href={`/grades?${closeEntryParams.toString()}`}>Annuler</Link>
              </Button>
            </>
          ) : (
            <Button variant="outline" asChild>
              <Link href={`/grades?${closeEntryParams.toString()}`}>Fermer</Link>
            </Button>
          )
        }
      >
        {readyToEnter ? (
          <form id="grades-entry-form" action={saveGrades} className="py-2">
            <FormPendingBridge />
            <input type="hidden" name="classId" value={classId} />
            <input type="hidden" name="subjectId" value={subjectId} />
            <input type="hidden" name="termId" value={termId} />
            {entryRoster.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {fullRoster.length === 0 ? "Aucun élève inscrit dans cette classe." : "Aucun élève ne correspond à la recherche."}
              </p>
            ) : (
              <div className="space-y-2">
                {entryRoster.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg border p-2.5">
                    <span className="text-sm font-medium">{s.name}</span>
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      max="20"
                      name={`score_${s.id}`}
                      defaultValue={s.score}
                      className="w-20"
                    />
                  </div>
                ))}
              </div>
            )}
            {params.entryError ? <p className="mt-3 text-sm text-destructive">{params.entryError}</p> : null}
          </form>
        ) : null}
      </FormModal>

      <Tabs defaultValue="results">
        <TabsList>
          <TabsTrigger value="results">Résultats par classe</TabsTrigger>
          <TabsTrigger value="bulletins">Bulletins</TabsTrigger>
          <TabsTrigger value="stats">Statistiques</TabsTrigger>
        </TabsList>

        <TabsContent value="results">
          {!classId ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Choisissez une classe pour voir les résultats.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Moyennes — {filterSummary}
                {search ? ` · recherche « ${search} »` : ""}
              </p>
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
                    {resultRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                          {fullRoster.length === 0
                            ? "Aucun élève inscrit dans cette classe."
                            : search
                              ? "Aucun élève ne correspond à la recherche."
                              : "Aucune note saisie pour cette classe."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      resultRows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{row.rank ?? "—"}</TableCell>
                          <TableCell className="font-medium">{row.name}</TableCell>
                          <TableCell>{row.average != null ? `${row.average.toFixed(1)} / 20` : "—"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
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
              <p className="text-sm text-muted-foreground">{filterSummary}</p>
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
