/** Valeur du filtre partenaire pour le partenaire technique WEB. */
export const SUBSCRIPTION_PARTNER_WEB = "web";

/** Limite par défaut pour la liste WEB (aligné backend take ?? 5000). */
export const DEFAULT_WEB_SUBSCRIPTION_TAKE = 5000;

export function isWebPartnerScope(partnerScope?: string): boolean {
  return !partnerScope || partnerScope === SUBSCRIPTION_PARTNER_WEB;
}
