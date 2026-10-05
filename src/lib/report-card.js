// Bulletin data loading + the average/rank math. Everything here reads real
// rows (students, enrollments, class_subjects, grades, attendance_records,
// report_card_comments) — nothing is hard-coded, so a school with no grades
// yet gets a bulletin full of "—" instead of fabricated numbers.

export const CYCLE_LABELS = {
  maternelle: "Maternelle",
  primaire: "Primaire",
  college: "Collège",
  lycee: "Lycée",
};

export function termOrdinalLabel(sequence) {
  return sequence === 1 ? "1er Trimestre" : `${sequence}ème Trimestre`;
}

export function frNumber(value, digits = 2) {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function frLongDate(value) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

// Weighted average across a set of { score, max_score, coefficient } rows —
// the same formula used for class rankings on the Notes & bulletins page,
// kept here so the bulletin's own average and the rank it reports against
// are always computed the same way.
function weightedAverage(rows) {
  let weighted = 0;
  let coefficients = 0;
  for (const { score, maxScore, coefficient } of rows) {
    if (score == null) continue;
    const normalized = (Number(score) / Number(maxScore || 20)) * 20;
    weighted += normalized * coefficient;
    coefficients += coefficient;
  }
  return coefficients > 0 ? weighted / coefficients : null;
}

// Null for a student with no enrollment this school year (nothing to show)
// or no matching term/student in this school — the caller 404s on null.
export async function loadReportCardData(supabase, { schoolId, studentId, termId }) {
  const [{ data: student }, { data: term }] = await Promise.all([
    supabase
      .from("students")
      .select("id, first_name, last_name, matricule, birth_date, birth_place, nationality, gender")
      .eq("id", studentId)
      .eq("school_id", schoolId)
      .maybeSingle(),
    supabase
      .from("terms")
      .select("id, name, sequence, start_date, end_date, school_year_id")
      .eq("id", termId)
      .eq("school_id", schoolId)
      .maybeSingle(),
  ]);
  if (!student || !term) return null;

  const [{ data: schoolYear }, { data: enrollment }, { data: appreciationRow }] = await Promise.all([
    supabase.from("school_years").select("label").eq("id", term.school_year_id).maybeSingle(),
    supabase
      .from("enrollments")
      .select("class_id, classes(id, name, levels(name, cycle))")
      .eq("student_id", studentId)
      .eq("school_year_id", term.school_year_id)
      .eq("status", "active")
      .maybeSingle(),
    supabase.from("report_card_comments").select("comment").eq("student_id", studentId).eq("term_id", termId).maybeSingle(),
  ]);

  const classInfo = enrollment?.classes ?? null;
  const classId = classInfo?.id ?? null;

  const [{ data: classSubjects }, { data: classmates }, { data: attendanceRows }] = await Promise.all([
    classId
      ? supabase.from("class_subjects").select("id, coefficient, subjects(id, name)").eq("class_id", classId)
      : Promise.resolve({ data: [] }),
    classId
      ? supabase.from("enrollments").select("student_id").eq("class_id", classId).eq("status", "active")
      : Promise.resolve({ data: [] }),
    supabase
      .from("attendance_records")
      .select("type")
      .eq("school_id", schoolId)
      .eq("student_id", studentId)
      .gte("occurred_on", term.start_date)
      .lte("occurred_on", term.end_date),
  ]);

  const classSubjectIds = (classSubjects ?? []).map((cs) => cs.id);
  const { data: gradeRows } = classSubjectIds.length
    ? await supabase
        .from("grades")
        .select("class_subject_id, score, max_score")
        .eq("term_id", termId)
        .eq("student_id", studentId)
        .in("class_subject_id", classSubjectIds)
    : { data: [] };
  const gradeByClassSubject = new Map((gradeRows ?? []).map((g) => [g.class_subject_id, g]));

  const subjectRows = (classSubjects ?? [])
    .map((cs) => {
      const grade = gradeByClassSubject.get(cs.id);
      const coefficient = Number(cs.coefficient ?? 1);
      const score = grade ? (Number(grade.score) / Number(grade.max_score || 20)) * 20 : null;
      return {
        subjectId: cs.subjects?.id,
        name: cs.subjects?.name ?? "—",
        coefficient,
        score,
        points: score != null ? score * coefficient : null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));

  // Ungraded subjects stay on the printed table (so the full programme is
  // visible) but don't count toward the average — a missing grade isn't a
  // zero.
  const gradedRows = subjectRows.filter((r) => r.score != null);
  const totalCoefficients = gradedRows.reduce((sum, r) => sum + r.coefficient, 0);
  const totalPoints = gradedRows.reduce((sum, r) => sum + r.points, 0);
  const average = totalCoefficients > 0 ? totalPoints / totalCoefficients : null;
  const maxPoints = totalCoefficients * 20;

  let rank = null;
  const classSize = (classmates ?? []).length;
  if (classId && classSubjectIds.length && classSize) {
    const classmateIds = classmates.map((e) => e.student_id);
    const { data: classGrades } = await supabase
      .from("grades")
      .select("student_id, score, max_score, class_subjects(coefficient)")
      .eq("term_id", termId)
      .in("class_subject_id", classSubjectIds);

    const byStudent = new Map();
    for (const g of classGrades ?? []) {
      const list = byStudent.get(g.student_id) ?? [];
      list.push({ score: g.score, maxScore: g.max_score, coefficient: Number(g.class_subjects?.coefficient ?? 1) });
      byStudent.set(g.student_id, list);
    }

    const ranked = classmateIds
      .map((id) => ({ id, avg: weightedAverage(byStudent.get(id) ?? []) }))
      .sort((a, b) => (b.avg ?? -1) - (a.avg ?? -1));
    let nextRank = 1;
    for (const row of ranked) {
      if (row.avg != null) row.rank = nextRank++;
    }
    rank = ranked.find((r) => r.id === studentId)?.rank ?? null;
  }

  return {
    student,
    term,
    termLabel: termOrdinalLabel(term.sequence),
    periodLabel:
      term.start_date && term.end_date ? `Du ${frLongDate(term.start_date)} au ${frLongDate(term.end_date)}` : null,
    schoolYearLabel: schoolYear?.label ?? "—",
    classLabel: classInfo?.name ?? "—",
    levelLabel: CYCLE_LABELS[classInfo?.levels?.cycle] ?? classInfo?.levels?.name ?? "—",
    classSize,
    subjectRows,
    totalCoefficients,
    totalPoints,
    average,
    maxPoints,
    rank,
    absenceDays: (attendanceRows ?? []).filter((r) => r.type === "absence").length,
    lateCount: (attendanceRows ?? []).filter((r) => r.type === "retard").length,
    appreciation: appreciationRow?.comment?.trim() || null,
  };
}

// Roster for "Générer tous les bulletins de la classe" — every actively
// enrolled student in the class, for the bulk print route.
export async function loadClassRosterForTerm(supabase, { schoolId, classId, schoolYearId }) {
  const { data } = await supabase
    .from("enrollments")
    .select("student_id, students(first_name, last_name)")
    .eq("school_id", schoolId)
    .eq("class_id", classId)
    .eq("school_year_id", schoolYearId)
    .eq("status", "active");

  return (data ?? [])
    .filter((e) => e.student_id)
    .map((e) => ({ id: e.student_id, name: `${e.students?.first_name ?? ""} ${e.students?.last_name ?? ""}`.trim() }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}
