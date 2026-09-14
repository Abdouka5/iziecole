// Derives start/end dates from a "2025-2026" style label (September 1 ->
// August 31) rather than showing separate date fields, since that's the
// school year everywhere in Senegal anyway.
export function datesFromLabel(label) {
  const match = /^(\d{4})\D+(\d{4})$/.exec(label);
  if (match) {
    const [, startYear, endYear] = match;
    return { startDate: `${startYear}-09-01`, endDate: `${endYear}-08-31` };
  }
  const year = new Date().getFullYear();
  return { startDate: `${year}-09-01`, endDate: `${year + 1}-08-31` };
}
