export const PERIOD_OPTIONS = [
  { value: "7d", label: "7 derniers jours" },
  { value: "30d", label: "30 derniers jours" },
  { value: "month", label: "Ce mois-ci" },
  { value: "3m", label: "3 derniers mois" },
  { value: "6m", label: "6 derniers mois" },
  { value: "year", label: "Cette année" },
  { value: "all", label: "Tout" },
  { value: "custom", label: "Période personnalisée" },
];

// Returns { start: Date|null, end: Date, label } for a period key — start
// is null for "all" (no lower bound). Defaults to "all" so pages behave
// exactly as before when no ?period= is present. For "custom", pass the
// ?from=/?to= (YYYY-MM-DD) query values — either can be left empty (open
// start, or "up to now" for the end).
export function getPeriodRange(periodKey, customFrom, customTo) {
  const now = new Date();
  const end = now;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (periodKey) {
    case "7d":
      return { start: new Date(startOfToday.getTime() - 6 * 86400000), end };
    case "30d":
      return { start: new Date(startOfToday.getTime() - 29 * 86400000), end };
    case "month":
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end };
    case "3m":
      return { start: new Date(now.getFullYear(), now.getMonth() - 2, 1), end };
    case "6m":
      return { start: new Date(now.getFullYear(), now.getMonth() - 5, 1), end };
    case "year":
      return { start: new Date(now.getFullYear(), 0, 1), end };
    case "custom":
      return {
        start: customFrom ? new Date(`${customFrom}T00:00:00`) : null,
        end: customTo ? new Date(`${customTo}T23:59:59.999`) : now,
      };
    case "all":
    default:
      return { start: null, end };
  }
}

// An equal-length window immediately before `range`, for "vs période
// précédente" comparisons. Returns null start/end for "all" (nothing
// meaningful precedes it).
export function previousPeriodRange({ start, end }) {
  if (!start) return { start: null, end: null };
  const durationMs = end.getTime() - start.getTime();
  return { start: new Date(start.getTime() - durationMs), end: new Date(start.getTime()) };
}

export function inPeriod(dateValue, { start, end }) {
  if (!dateValue) return false;
  const d = new Date(dateValue);
  if (start && d < start) return false;
  if (end && d > end) return false;
  return true;
}

// Human label for the current ?period=/?from=/?to= — used in page subtitles,
// report headers and file names.
export function describePeriod(periodKey, customFrom, customTo) {
  if (periodKey === "custom") {
    const fmt = (d) => new Date(`${d}T00:00:00`).toLocaleDateString("fr-FR");
    if (customFrom && customTo) return `du ${fmt(customFrom)} au ${fmt(customTo)}`;
    if (customFrom) return `depuis le ${fmt(customFrom)}`;
    if (customTo) return `jusqu'au ${fmt(customTo)}`;
    return "Toutes les périodes";
  }
  if (!periodKey || periodKey === "all") return "Toutes les périodes";
  return PERIOD_OPTIONS.find((o) => o.value === periodKey)?.label ?? "Toutes les périodes";
}

// Keeps the rows whose date falls inside the selected period. "all" (or no
// period) keeps everything, including rows dated in the future — inPeriod()
// alone would drop those since the "all" range ends now. Unlike the admin
// pages' `if (range.start)` check, this also honours a custom range that
// only has an end date.
export function filterByPeriod(rows, dateOf, { period, from, to }) {
  if (!period || period === "all") return rows;
  const range = getPeriodRange(period, from, to);
  return rows.filter((row) => inPeriod(dateOf(row), range));
}
