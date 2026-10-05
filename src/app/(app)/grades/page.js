import Link from "next/link";
import { FileText, BarChart3, Users2, Award, PenSquare, Printer, FilePenLine, Files } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";
import { getTermsForCurrentYear } from "@/lib/school-defaults";
import { CYCLE_LABELS } from "@/lib/report-card";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { FormModal } from "@/components/layout/form-modal";
import { Button } from "@/components/ui/button";
import { ModalSubmitButton } from "@/components/ui/modal-submit-button";
import { FormPendingBridge } from "@/components/ui/form-pending-bridge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GradeFilters } from "./grade-filters";
import { StudentTermPicker } from "./student-term-picker";
import { GradeEntryEditor } from "./grade-entry-editor";
import { saveStudentGrades, saveAppreciation } from "./actions";

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

// Everything the per-student "Saisir les notes" editor needs: the class's
// matières + configured coefficients (class_subjects), and this student's
// existing grades grouped by term — loaded for every term at once so
// switching the Trimestre select inside the modal is instant, no reload.
async function loadGradeEntryData(supabase, schoolId, studentId) {
  const { data: student } = await supabase
    .from("students")
    .select("id, first_name, last_name, matricule")
    .eq("id", studentId)
    .eq("school_id", schoolId)
    .maybeSingle();
  if (!student) return null;

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("class_id, classes(id, name, levels(name, cycle))")
    .eq("student_id", studentId)
    .eq("status", "active")
    .maybeSingle();

  const classInfo = enrollment?.classes ?? null;
  const classId = classInfo?.id ?? null;

  const { data: classSubjectsRaw } = classId
    ? await supabase.from("class_subjects").select("id, subject_id, coefficient").eq("class_id", classId)
    : { data: [] };
  const classSubjectIdToSubject = new Map((classSubjectsRaw ?? []).map((cs) => [cs.id, cs.subject_id]));
  const classSubjectIds = [...classSubjectIdToSubject.keys()];

  const { data: gradeRows } = classSubjectIds.length
    ? await supabase.from("grades").select("term_id, score, class_subject_id").eq("student_id", studentId).in("class_subject_id", classSubjectIds)
    : { data: [] };

  const gradesByTerm = {};
  for (const g of gradeRows ?? []) {
    const subjectId = classSubjectIdToSubject.get(g.class_subject_id);
    if (!subjectId) continue;
    (gradesByTerm[g.term_id] ??= []).push({ subjectId, score: g.score });
  }

  return {
    student,
    classId,
    classLabel: classInfo?.name ?? null,
    levelLabel: classInfo?.levels ? CYCLE_LABELS[classInfo.levels.cycle] ?? classInfo.levels.name : null,
    classSubjects: (classSubjectsRaw ?? []).map((cs) => ({ subjectId: cs.subject_id, coefficient: Number(cs.coefficient) })),
    gradesByTerm,
  };
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
  const entryStudentId = params.studentId;

  const [{ data: classes }, { data: subjects }, { data: allGrades }, { terms, year }, { data: pickerEnrollments }] =
    await Promise.all([
      supabase.from("classes").select("id, name").eq("school_id", schoolId).order("name"),
      supabase.from("subjects").select("id, name").eq("school_id", schoolId).order("name"),
      supabase
        .from("grades")
        .select("student_id, score, max_score, term_id, class_subjects(coefficient, class_id, subject_id, subjects(name))")
        .eq("school_id", schoolId),
      getTermsForCurrentYear(supabase, schoolId),
      supabase
        .from("enrollments")
        .select("student_id, students(id, first_name, last_name, matricule), classes(name)")
        .eq("school_id", schoolId)
        .eq("status", "active"),
    ]);

  const pickerStudents = (pickerEnrollments ?? [])
    .filter((e) => e.students?.id)
    .map((e) => ({
      id: e.students.id,
      firstName: e.students.first_name,
      lastName: e.students.last_name,
      matricule: e.students.matricule,
      className: e.classes?.name ?? null,
    }));

  const entryTermId = params.gradeTermId || termId || terms[0]?.id || "";
  const gradeEntryData = entryOpen && entryStudentId ? await loadGradeEntryData(supabase, schoolId, entryStudentId) : null;
  const canGradeSubjects = membership.role === "school_admin";

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
    Object.entries(params).filter(([k]) => !["entry", "saved", "entryError", "studentId", "gradeTermId"].includes(k)),
  );
  entryHrefParams.set("entry", "1");
  // The page's own filters as they were before "Saisir des notes" was
  // opened — what the modal's "Annuler"/close goes back to, and what the
  // save action restores afterward (see returnTo in saveStudentGrades).
  const returnToParams = new URLSearchParams(
    Object.entries(params).filter(([k]) => !["entry", "saved", "entryError", "studentId", "gradeTermId"].includes(k)),
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

  // Bulletins need one specific class + term (not the optional subjectId
  // filter the rest of the page uses) — averages/rank are recomputed from
  // allGrades scoped that way so switching the "Matière" filter up top
  // never changes what a bulletin shows.
  const bulletinReady = Boolean(classId && termId);
  let bulletinRows = [];
  let commentByStudent = new Map();
  if (bulletinReady) {
    const bulletinGrades = (allGrades ?? []).filter(
      (g) => g.class_subjects?.class_id === classId && g.term_id === termId,
    );
    const bulletinAverages = studentAverages(bulletinGrades);
    const rankedForBulletins = fullRoster
      .map((s) => ({ ...s, average: bulletinAverages.get(s.id) ?? null }))
      .sort((a, b) => (b.average ?? -1) - (a.average ?? -1));
    let nextBulletinRank = 1;
    for (const row of rankedForBulletins) if (row.average != null) row.rank = nextBulletinRank++;
    bulletinRows = [...rankedForBulletins].sort((a, b) => a.name.localeCompare(b.name, "fr"));

    if (fullRoster.length > 0) {
      const { data: comments } = await supabase
        .from("report_card_comments")
        .select("student_id, comment")
        .eq("term_id", termId)
        .in(
          "student_id",
          fullRoster.map((s) => s.id),
        );
      commentByStudent = new Map((comments ?? []).map((c) => [c.student_id, c.comment]));
    }
  }
  const appreciationTarget = params.appreciation
    ? bulletinRows.find((s) => s.id === params.appreciation)
    : null;
  const appreciationCloseParams = new URLSearchParams(
    Object.entries(params).filter(([k]) => !["appreciation", "appreciationSaved", "appreciationError"].includes(k)),
  );

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
        closeHref={`/grades?${returnToParams.toString()}`}
        title={
          <span className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <PenSquare className="h-4 w-4" />
            </span>
            Saisir les notes
          </span>
        }
        description="Enregistrez les notes de composition du trimestre pour cet élève."
        className="sm:max-w-2xl"
        footer={
          gradeEntryData?.classId ? (
            <>
              <ModalSubmitButton form="grade-entry-form" pendingText="Enregistrement...">
                Enregistrer les notes
              </ModalSubmitButton>
              <Button variant="outline" asChild>
                <Link href={`/grades?${returnToParams.toString()}`}>Annuler</Link>
              </Button>
            </>
          ) : (
            <Button variant="outline" asChild>
              <Link href={`/grades?${returnToParams.toString()}`}>Annuler</Link>
            </Button>
          )
        }
      >
        {!entryStudentId ? (
          <StudentTermPicker students={pickerStudents} terms={terms} initialTermId={entryTermId} />
        ) : !gradeEntryData ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Élève introuvable.</p>
        ) : !gradeEntryData.classId ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Cet élève n&apos;est affecté à aucune classe pour l&apos;année en cours — affectez-le d&apos;abord dans
            Élèves.
          </p>
        ) : (
          <>
            <GradeEntryEditor
              formId="grade-entry-form"
              action={saveStudentGrades}
              returnTo={returnToParams.toString()}
              studentId={gradeEntryData.student.id}
              classId={gradeEntryData.classId}
              student={{
                firstName: gradeEntryData.student.first_name,
                lastName: gradeEntryData.student.last_name,
                matricule: gradeEntryData.student.matricule,
              }}
              classLabel={gradeEntryData.classLabel}
              levelLabel={gradeEntryData.levelLabel}
              schoolYearLabel={year?.label ?? "—"}
              terms={terms}
              initialTermId={terms.some((t) => t.id === entryTermId) ? entryTermId : terms[0]?.id ?? ""}
              subjectCatalog={subjects ?? []}
              classSubjects={gradeEntryData.classSubjects}
              gradesByTerm={gradeEntryData.gradesByTerm}
              canEditCoefficient={canGradeSubjects}
              canAddNewSubject={canGradeSubjects}
            />
            {params.entryError ? <p className="px-1 text-sm text-destructive">{params.entryError}</p> : null}
          </>
        )}
      </FormModal>

      <FormModal
        open={Boolean(appreciationTarget)}
        closeHref={`/grades?${appreciationCloseParams.toString()}`}
        title="Appréciation du conseil de classe"
        description={appreciationTarget ? appreciationTarget.name : undefined}
        className="sm:max-w-lg"
        footer={
          <>
            <ModalSubmitButton form="appreciation-form" pendingText="Enregistrement...">
              Enregistrer
            </ModalSubmitButton>
            <Button variant="outline" asChild>
              <Link href={`/grades?${appreciationCloseParams.toString()}`}>Annuler</Link>
            </Button>
          </>
        }
      >
        {appreciationTarget ? (
          <form id="appreciation-form" action={saveAppreciation} className="space-y-3 py-2">
            <FormPendingBridge />
            <input type="hidden" name="studentId" value={appreciationTarget.id} />
            <input type="hidden" name="termId" value={termId ?? ""} />
            <input type="hidden" name="classId" value={classId ?? ""} />
            <Textarea
              name="comment"
              rows={5}
              placeholder="Élève sérieux, travailleur et régulier..."
              defaultValue={commentByStudent.get(appreciationTarget.id) ?? ""}
            />
            {params.appreciationError ? (
              <p className="text-sm text-destructive">{params.appreciationError}</p>
            ) : null}
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
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedResultRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={classId ? 4 : 5} className="py-10 text-center text-muted-foreground">
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
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" asChild title="Saisir les notes">
                            <Link
                              href={`/grades?${new URLSearchParams({ ...params, entry: "1", studentId: row.id, gradeTermId: entryTermId }).toString()}`}
                            >
                              <PenSquare className="h-4 w-4" />
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
        </TabsContent>

        <TabsContent value="bulletins">
          {!bulletinReady ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Choisissez une classe et une période dans les filtres ci-dessus pour générer des bulletins.
              </CardContent>
            </Card>
          ) : bulletinRows.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Aucun élève inscrit dans cette classe.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  {selectedClass?.name ?? "Classe"} · {selectedTerm?.name ?? "Période"} · {bulletinRows.length} élève
                  {bulletinRows.length > 1 ? "s" : ""}
                </p>
                <Button variant="outline" asChild>
                  <Link href={`/bulletin/class/${classId}/${termId}`} target="_blank">
                    <Files className="mr-1.5 h-4 w-4" />
                    Générer tous les bulletins de la classe
                  </Link>
                </Button>
              </div>
              <div className="overflow-x-auto rounded-2xl border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rang</TableHead>
                      <TableHead>Élève</TableHead>
                      <TableHead>Moyenne</TableHead>
                      <TableHead>Appréciation</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bulletinRows.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>{s.rank ?? "—"}</TableCell>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>{s.average != null ? `${s.average.toFixed(1)} / 20` : "—"}</TableCell>
                        <TableCell className="max-w-[220px] truncate text-muted-foreground">
                          {commentByStudent.get(s.id) || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" asChild title="Modifier l'appréciation">
                              <Link href={`/grades?${new URLSearchParams({ ...params, appreciation: s.id }).toString()}`}>
                                <FilePenLine className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button variant="ghost" size="icon" asChild title="Générer le bulletin">
                              <Link href={`/bulletin/${s.id}/${termId}`} target="_blank">
                                <Printer className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
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
