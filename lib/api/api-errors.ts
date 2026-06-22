import { ApiError } from "./client";

export const PARTNER_ERROR_MESSAGES: Record<string, string> = {
  INVALID_PARTNER_APIKEY:
    "Clé API invalide ou révoquée. Faites une rotation depuis Partners > Détail > Rotate key.",
  PARTNER_INACTIVE:
    "Le partenaire est désactivé. Activez-le d'abord depuis Partners.",
  PARTNER_APIKEY_MISSING: "Le partenaire n'a pas de clé API.",
  PARTNER_ENDPOINT_NOT_CONFIGURED:
    "Endpoint non activé pour ce partenaire. Allez à Partner-Endpoints pour l'activer.",
  PARTNER_ENDPOINT_SCHEMA_MISSING:
    "Aucun schéma comptable attaché. Attachez-en un depuis Partner-Endpoints.",
  MISSING_PARTNER_APIKEY:
    "Sélectionnez un partenaire dans la topbar pour cette opération.",
  WEB_PARTNER_FORBIDDEN:
    "Cette opération financière requiert l'authentification d'un partenaire réel. Connectez-vous à un compte admin et sélectionnez un partenaire dans la topbar.",
  PARTNER_CODE_NOT_ALLOWED: "Code partenaire non autorisé.",
  PARTNER_CODE_EXISTS: "Ce partenaire existe déjà.",
};

/** Erreurs attendues sans partenaire actif — pas de toast global. */
const SILENT_PARTNER_ERROR_CODES = new Set(["MISSING_PARTNER_APIKEY"]);

export function shouldToastPartnerApiError(code: string | undefined): boolean {
  if (!code || !(code in PARTNER_ERROR_MESSAGES)) return false;
  return !SILENT_PARTNER_ERROR_CODES.has(code);
}

export function resolveApiErrorMessage(
  error: unknown,
  fallback = "Une erreur est survenue",
): string {
  if (error instanceof ApiError && error.code) {
    const mapped = PARTNER_ERROR_MESSAGES[error.code];
    if (mapped) return mapped;
    if (error.message) return error.message;
  }
  return fallback;
}

export function isKnownPartnerApiError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    !!error.code &&
    error.code in PARTNER_ERROR_MESSAGES
  );
}

export function isSilentPartnerApiError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    !!error.code &&
    SILENT_PARTNER_ERROR_CODES.has(error.code)
  );
}
