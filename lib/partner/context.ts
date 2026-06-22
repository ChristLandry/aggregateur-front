"use client";

import { usePartnerStore } from "./store";
import { getWebPartnerApiKey, resolvePartnerApiKey } from "./api-key";

export { resolvePartnerApiKey, getWebPartnerApiKey, hasResolvablePartnerApiKey } from "./api-key";

/** Contexte API partenaire disponible (sélection topbar ou clé WEB). */
export function hasPartnerApiContext(): boolean {
  return !!resolvePartnerApiKey();
}

export function useHasPartnerApiContext(): boolean {
  const selected = usePartnerStore((s) => s.currentPartner?.partnerApiKey);
  return !!selected || !!getWebPartnerApiKey();
}
