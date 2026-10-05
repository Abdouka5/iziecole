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
import { GradeEntryFilters } from "./grade-entry-filters";
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

const RESULTS_PAGE_SIZE = 30;

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

  // Without a class filter this is every active student in the school
  // (Classe column added below so each row still says which class), not
  // just whichever one the admin happens to have selected.
  let enrollmentsQuery = supabase
    .from("enrollments")
    .select("student_id, students(id, first_name, last_name), classes(name)")
    .eq("school_id", schoolId)
    .eq("status", "active");
  if (classId) enrollmentsQuery = enrollmentsQuery.eq("class_id", classId);
  const { data: enrollments } = await enrollmentsQuery;
  const fullRoster = (enrollments ?? [])
    .filter((e) => e.students?.id)
    .map((e) => ({
      id: e.students.id,
      name: `${e.students.first_name ?? ""} ${e.students.last_name ?? ""}`.trim(),
      className: e.classes?.name ?? "—",
    }));
  const matchesSearch = (name) => !search || normalize(name).includes(normalize(search));

  // Rank is among the whole class (only students who have a grade in the
  // current filter), and searching only narrows what is displayed.
  const ranked = fullRoster
    .map((s) => ({ ...s, average: filteredAverages.get(s.id) ?? null }))
    .sort((a, b) => (b.average ?? -1) - (a.average ?? -1));
  let nextRank = 1;
  for (const row of ranked) row.rank = row.average != null ? nextRank++ : null;
  const resultRows = ranked.filter((r) => matchesSearch(r.name));

  // Shown without requiring a class filter first — 30 at a time, the top
  // filters (and search) still narrow it down if you want.
  const resultsPageCount = Math.max(1, Math.ceil(resultRows.length / RESULTS_PAGE_SIZE));
  const resultsPage = Math.min(Math.max(1, Number(params.resultsPage) || 1), resultsPageCount);
  const pagedResultRows = resultRows.slice(
    (resultsPage - 1) * RESULTS_PAGE_SIZE,
    resultsPage * RESULTS_PAGE_SIZE,
  );
  function resultsPageHref(targetPage) {
    const sp = new URLSearchParams(
      Object.entries(params).filter(([k]) => !["entry", "saved", "entryError", "resultsPage"].includes(k)),
    );
    if (targetPage > 1) sp.set("resultsPage", String(targetPage));
    return `/grades?${sp.toString()}`;
  }

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
        description="Choisissez la classe, la matière et la période, puis saisissez les notes."
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
        <div className="space-y-4 py-2">
          <GradeEntryFilters classes={classes ?? []} terms={terms} subjects={subjects ?? []} />

          {readyToEnter ? (
            <form id="grades-entry-form" action={saveGrades}>
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
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Sélectionnez une classe, une matière et une période pour afficher la liste des élèves.
            </p>
          )}
        </div>
      </FormModal>

      <Tabs defaultValue="results">
        <TabsList>
          <TabsTrigger value="results">Résultats par classe</TabsTrigger>
          <TabsTrigger value="bulletins">Bulletins</TabsTrigger>
          <TabsTrigger value="stats">Statistiques</TabsTrigger>
        </TabsList>

        <TabsContent value="results">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                Moyennes — {filterSummary}
                {search ? ` · recherche « ${search} »` : ""}
                {resultRows.length > 0 ? ` · ${resultRows.length} élève${resultRows.length > 1 ? "s" : ""}` : ""}
              </p>
              {resultsPageCount > 1 ? (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={resultsPage <= 1} asChild={resultsPage > 1}>
                    {resultsPage > 1 ? <Link href={resultsPageHref(resultsPage - 1)}>Précédent</Link> : <span>Précédent</span>}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Page {resultsPage} / {resultsPageCount}
                  </span>
                  <Button variant="outline" size="sm" disabled={resultsPage >= resultsPageCount} asChild={resultsPage < resultsPageCount}>
                    {resultsPage < resultsPageCount ? (
                      <Link href={resultsPageHref(resultsPage + 1)}>Suivant</Link>
                    ) : (
                      <span>Suivant</span>
                    )}
                  </Button>
                </div>
              ) : null}
            </div>
            <div className="overflow-x-auto rounded-2xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rang</TableHead>
                    <TableHead>Élève</TableHead>
                    {!classId ? <TableHead>Classe</TableHead> : null}
                    <TableHead>Moyenne</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedResultRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={classId ? 3 : 4} className="py-10 text-center text-muted-foreground">
                        {fullRoster.length === 0
                          ? classId
                            ? "Aucun élève inscrit dans cette classe."
                            : "Aucun élève actif dans l'établissement."
                          : "Aucun élève ne correspond à la recherche."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedResultRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.rank ?? "—"}</TableCell>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        {!classId ? <TableCell className="text-muted-foreground">{row.className}</TableCell> : null}
                        <TableCell>{row.average != null ? `${row.average.toFixed(1)} / 20` : "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
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
