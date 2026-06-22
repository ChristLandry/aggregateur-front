import { usePartnerStore } from "./store";

/** Clé API du partenaire WEB (NEXT_PUBLIC_WEB_PARTNER_APIKEY). */
export function getWebPartnerApiKey(): string | undefined {
  const key = process.env.NEXT_PUBLIC_WEB_PARTNER_APIKEY?.trim();
  return key || undefined;
}

/**
 * Clé envoyée dans X-Partner-ApiKey : partenaire sélectionné en topbar,
 * sinon fallback silencieux sur la clé WEB.
 */
export function resolvePartnerApiKey(): string | undefined {
  const selected = usePartnerStore.getState().currentPartner?.partnerApiKey;
  if (selected) return selected;
  return getWebPartnerApiKey();
}

export function hasResolvablePartnerApiKey(): boolean {
  return !!resolvePartnerApiKey();
}
