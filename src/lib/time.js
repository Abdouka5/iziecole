const UNITS = [
  { limit: 60, divisor: 1, unit: "seconde" },
  { limit: 3600, divisor: 60, unit: "minute" },
  { limit: 86400, divisor: 3600, unit: "heure" },
  { limit: 604800, divisor: 86400, unit: "jour" },
  { limit: 2629800, divisor: 604800, unit: "semaine" },
  { limit: Infinity, divisor: 2629800, unit: "mois" },
];

export function timeAgo(date) {
  const seconds = Math.max(0, (Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 30) return "À l'instant";

  const { divisor, unit } = UNITS.find((u) => seconds < u.limit);
  const value = Math.floor(seconds / divisor);
  return `Il y a ${value} ${unit}${value > 1 ? "s" : ""}`;
}

export function calculateAge(birthDate) {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}
