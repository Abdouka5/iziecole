// iziecole runs a single flat-price subscription: every feature, every
// school level, one price, renewed every 30 days. (Previously 4 tiers
// priced by level covered — simplified 2026-09-14, see docs/decisions.md.)
export const SUBSCRIPTION_PRICE = 25000; // FCFA
export const SUBSCRIPTION_DURATION_DAYS = 30;

export function formatFcfa(amount) {
  return `${amount.toLocaleString("fr-FR")} FCFA`;
}
