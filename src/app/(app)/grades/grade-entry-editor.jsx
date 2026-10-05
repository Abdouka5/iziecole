"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { termOrdinalLabel, frNumber } from "@/lib/report-card";
import { FormPendingBridge } from "@/components/ui/form-pending-bridge";

let rowSeq = 0;
function newRowKey() {
  rowSeq += 1;
  return `new${Date.now()}${rowSeq}`;
}

function rowsFromGrades(grades, classSubjectBySubject) {
  return (grades ?? []).map((g) => ({
    key: `existing-${g.subjectId}`,
    subjectId: g.subjectId,
    coefficient: String(classSubjectBySubject.get(g.subjectId)?.coefficient ?? 1),
    score: String(g.score),
    existing: true,
  }));
}

// The per-student "composition du trimestre" editor: one row per matière
// (no Devoir 1/2/3 — this school system only ever has a single score per
// subject per term), with points and the moyenne recomputed live as you
// type. Switching Trimestre swaps rows client-side from gradesByTerm
// (already loaded for every term) instead of round-tripping the server.
export function GradeEntryEditor({
  formId,
  action,
  returnTo,
  studentId,
  classId,
  student,
  classLabel,
  levelLabel,
  schoolYearLabel,
  terms,
  initialTermId,
  subjectCatalog,
  classSubjects,
  gradesByTerm,
  canEditCoefficient,
  canAddNewSubject,
}) {
  const classSubjectBySubject = new Map(classSubjects.map((cs) => [cs.subjectId, cs]));
  const [termId, setTermId] = useState(initialTermId);
  const [rows, setRows] = useState(() => rowsFromGrades(gradesByTerm[initialTermId], classSubjectBySubject));

  function handleTermChange(nextTermId) {
    setTermId(nextTermId);
    setRows(rowsFromGrades(gradesByTerm[nextTermId], classSubjectBySubject));
  }

  function addRow() {
    setRows((prev) => [...prev, { key: newRowKey(), subjectId: "", coefficient: "1", score: "", existing: false }]);
  }

  function removeRow(row) {
    if (row.existing && !confirm("Cette note est déjà enregistrée. La supprimer ?")) return;
    setRows((prev) => prev.filter((r) => r.key !== row.key));
  }

  function updateRow(key, field, value) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.key !== key) return r;
        const next = { ...r, [field]: value };
        if (field === "subjectId") {
          const configured = classSubjectBySubject.get(value);
          if (configured) next.coefficient = String(configured.coefficient);
        }
        return next;
      }),
    );
  }

  const usedSubjectIds = new Set(rows.map((r) => r.subjectId).filter(Boolean));
  const selectableSubjects = canAddNewSubject
    ? subjectCatalog
    : subjectCatalog.filter((s) => classSubjectBySubject.has(s.id));

  const computed = rows.map((r) => {
    const score = Number.parseFloat(r.score);
    const coefficient = Number.parseFloat(r.coefficient);
    const valid = Number.isFinite(score) && Number.isFinite(coefficient);
    return { ...r, points: valid ? score * coefficient : null, validCoefficient: Number.isFinite(coefficient) ? coefficient : 0 };
  });
  const totalCoefficients = computed.reduce((sum, r) => sum + r.validCoefficient, 0);
  const totalPoints = computed.reduce((sum, r) => sum + (r.points ?? 0), 0);
  const average = totalCoefficients > 0 ? totalPoints / totalCoefficients : null;

  return (
    <form id={formId} action={action} className="space-y-5 py-2">
      <FormPendingBridge />
      <input type="hidden" name="studentId" value={studentId} />
      <input type="hidden" name="classId" value={classId ?? ""} />
      <input type="hidden" name="returnTo" value={returnTo ?? ""} />

      <div className="rounded-xl border bg-muted/30 p-4">
        <p className="mb-3 text-sm font-semibold text-foreground">Informations de l&apos;élève</p>
        <div className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          <div className="space-y-1.5">
            <InfoRow label="Nom" value={student.lastName} />
            <InfoRow label="Prénom(s)" value={student.firstName} />
            <InfoRow label="Matricule" value={student.matricule} />
            <InfoRow label="Classe" value={classLabel} />
          </div>
          <div className="space-y-1.5">
            <InfoRow label="Niveau" value={levelLabel} />
            <InfoRow label="Année scolaire" value={schoolYearLabel} />
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Trimestre :</span>
              <Select name="termId" value={termId} onValueChange={handleTermChange}>
                <SelectTrigger className="h-8 w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {terms.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {termOrdinalLabel(t.sequence)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Notes par matière</p>
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nouvelle matière
          </Button>
        </div>

        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Matière</TableHead>
                <TableHead className="w-24">Coefficient</TableHead>
                <TableHead className="w-28">Note /20</TableHead>
                <TableHead className="w-24">Points</TableHead>
                <TableHead className="w-12 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {computed.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Aucune matière. Cliquez sur « Nouvelle matière » pour commencer.
                  </TableCell>
                </TableRow>
              ) : (
                computed.map((row, i) => (
                  <TableRow key={row.key}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell>
                      <Select
                        name={`subjectId_${row.key}`}
                        value={row.subjectId}
                        onValueChange={(v) => updateRow(row.key, "subjectId", v)}
                      >
                        <SelectTrigger className="w-full min-w-[160px]">
                          <SelectValue placeholder="Choisir" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectableSubjects
                            .filter((s) => s.id === row.subjectId || !usedSubjectIds.has(s.id))
                            .map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        name={`coefficient_${row.key}`}
                        value={row.coefficient}
                        readOnly={!canEditCoefficient}
                        className={canEditCoefficient ? "w-16" : "w-16 bg-muted"}
                        onChange={(e) => canEditCoefficient && updateRow(row.key, "coefficient", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        max="20"
                        step="0.25"
                        name={`score_${row.key}`}
                        value={row.score}
                        onChange={(e) => updateRow(row.key, "score", e.target.value)}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell className="font-medium tabular-nums">
                      {row.points != null ? frNumber(row.points, 1) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeRow(row)}
                        aria-label="Supprimer cette matière"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Total des coefficients</p>
          <p className="mt-1 text-lg font-bold">{totalCoefficients || "—"}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">Total des points</p>
          <p className="mt-1 text-lg font-bold">{frNumber(totalPoints, 1)}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">Moyenne générale</p>
          <p className="mt-1 text-lg font-bold text-status-good">
            {average != null ? `${frNumber(average, 1)} / 20` : "—"}
          </p>
        </div>
      </div>
    </form>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label} :</span>
      <span className="font-medium">{value || "—"}</span>
    </div>
  );
}
