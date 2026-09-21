// Index = timetable_slots.day_of_week (0 = lundi … 6 = dimanche).
export const DAY_LABELS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

const ACCENT_KEYS = ["blue", "green", "purple", "amber", "pink"];

// Same subject name -> same color, everywhere the timetable is drawn.
export function hashToAccent(name) {
  let hash = 0;
  for (const char of name) hash = (hash + char.charCodeAt(0)) % ACCENT_KEYS.length;
  return ACCENT_KEYS[hash];
}

export function formatTime(t) {
  return t?.slice(0, 5) ?? "";
}
