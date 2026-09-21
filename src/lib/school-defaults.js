// Matières couramment enseignées au Sénégal, de l'élémentaire à la
// Terminale (séries L et S), telles que fournies par l'utilisateur.
export const DEFAULT_SUBJECTS = [
  { name: "Français", code: "FR" },
  { name: "Mathématiques", code: "MATH" },
  { name: "Éducation scientifique et technologique" },
  { name: "Histoire", code: "HIST" },
  { name: "Géographie", code: "GEO" },
  { name: "Éducation civique et morale", code: "ECM" },
  { name: "Éducation artistique" },
  { name: "Éducation musicale" },
  { name: "Éducation physique et sportive", code: "EPS" },
  { name: "Langues nationales" },
  { name: "Arabe / Éducation religieuse" },
  { name: "Sciences de la Vie et de la Terre", code: "SVT" },
  { name: "Sciences physiques", code: "SP" },
  { name: "Anglais", code: "ANG" },
  { name: "Espagnol", code: "ESP" },
  { name: "Arabe", code: "AR" },
  { name: "Éducation civique", code: "EC" },
  { name: "Informatique / TIC" },
  { name: "Éducation religieuse" },
  { name: "Littérature", code: "LITT" },
  { name: "Philosophie", code: "PHILO" },
];

// Standard Senegalese school levels, Maternelle -> Terminale, grouped by the
// 4 cycles the app already recognizes (see the `level_cycle` enum).
export const DEFAULT_LEVELS = [
  { name: "Petite Section", cycle: "maternelle" },
  { name: "Moyenne Section", cycle: "maternelle" },
  { name: "Grande Section", cycle: "maternelle" },
  { name: "CI", cycle: "primaire" },
  { name: "CP", cycle: "primaire" },
  { name: "CE1", cycle: "primaire" },
  { name: "CE2", cycle: "primaire" },
  { name: "CM1", cycle: "primaire" },
  { name: "CM2", cycle: "primaire" },
  { name: "6ème", cycle: "college" },
  { name: "5ème", cycle: "college" },
  { name: "4ème", cycle: "college" },
  { name: "3ème", cycle: "college" },
  { name: "2nde", cycle: "lycee" },
  { name: "1ère L", cycle: "lycee" },
  { name: "1ère S", cycle: "lycee" },
  { name: "Terminale L", cycle: "lycee" },
  { name: "Terminale S", cycle: "lycee" },
];

// Called both right after a school is created (signup) and defensively from
// Paramètres (self-heals any school created before this existed) — schools
// get these automatically now, there's no more manual "seed" button.
export async function ensureDefaultSubjects(supabase, schoolId) {
  const { count } = await supabase
    .from("subjects")
    .select("id", { count: "exact", head: true })
    .eq("school_id", schoolId);
  if (count) return;

  await supabase.from("subjects").insert(
    DEFAULT_SUBJECTS.map((s) => ({
      school_id: schoolId,
      name: s.name,
      code: s.code ?? null,
    })),
  );
}

export async function ensureDefaultLevels(supabase, schoolId) {
  const { count } = await supabase
    .from("levels")
    .select("id", { count: "exact", head: true })
    .eq("school_id", schoolId);
  if (count) return;

  await supabase.from("levels").insert(
    DEFAULT_LEVELS.map((l, i) => ({
      school_id: schoolId,
      name: l.name,
      cycle: l.cycle,
      display_order: i,
    })),
  );
}

// Grades can't exist without a term (trimestre), and no screen creates them,
// so the Notes page's "Période" filter was always empty. This returns the
// terms of the school's current year (the flagged one, else the latest) and
// seeds three of four months each — the year is split from its own start
// date — the first time there are none. Seeding needs admin rights (RLS);
// for anyone else it just returns what exists.
export async function getTermsForCurrentYear(supabase, schoolId) {
  const { data: years } = await supabase
    .from("school_years")
    .select("id, label, start_date, end_date, is_current")
    .eq("school_id", schoolId)
    .order("start_date", { ascending: false });
  const year = (years ?? []).find((y) => y.is_current) ?? years?.[0];
  if (!year) return { year: null, terms: [] };

  const loadTerms = () =>
    supabase.from("terms").select("id, name, sequence").eq("school_year_id", year.id).order("sequence");

  let { data: terms } = await loadTerms();
  if (terms?.length) return { year, terms };

  const start = new Date(`${year.start_date}T00:00:00Z`);
  const monthStart = (offset) => new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + offset, 1));
  const iso = (d) => d.toISOString().slice(0, 10);
  const dayBefore = (d) => new Date(d.getTime() - 86400000);
  const windows = [
    { start: year.start_date, end: iso(dayBefore(monthStart(4))) },
    { start: iso(monthStart(4)), end: iso(dayBefore(monthStart(8))) },
    { start: iso(monthStart(8)), end: year.end_date },
  ];

  await supabase.from("terms").insert(
    windows.map((w, i) => ({
      school_id: schoolId,
      school_year_id: year.id,
      name: `Trimestre ${i + 1}`,
      sequence: i + 1,
      start_date: w.start,
      end_date: w.end,
    })),
  );

  ({ data: terms } = await loadTerms());
  return { year, terms: terms ?? [] };
}
