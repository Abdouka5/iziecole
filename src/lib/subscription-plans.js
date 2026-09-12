// The 4 iziecole subscription formulas — see docs/cahier-des-charges.md §6.
// Every plan includes every module; the plan only determines which school
// level(s) it covers.
export const PLAN_LABELS = {
  prescolaire: "Préscolaire (La Maternelle)",
  elementaire: "Élémentaire (Le Primaire)",
  college_lycee: "Le Collège au Lycée",
  ecole_complete: "École complète",
};

// FCFA per month.
export const PLAN_PRICES = {
  prescolaire: 5000,
  elementaire: 15000,
  college_lycee: 25000,
  ecole_complete: 35000,
};

export function formatFcfa(amount) {
  return `${amount.toLocaleString("fr-FR")} FCFA`;
}
