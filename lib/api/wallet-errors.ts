import { ApiError } from "./client";
import { ONBOARD_ERROR_MESSAGES } from "./onboard-errors";

export const WALLET_ERROR_MESSAGES: Record<string, string> = {
  ...ONBOARD_ERROR_MESSAGES,
  PARTNER_NOT_FOUND: "Partenaire introuvable. Rafraîchissez la liste.",
  PARTNER_INACTIVE: "Le partenaire est désactivé.",
  WALLET_LINK_FAILED: "Échec de la liaison wallet. Vérifiez les données et réessayez.",
  KYC_NOT_FOUND: "Aucun abonnement pour ce numéro chez ce partenaire.",
  WEB_PARTNER_FORBIDDEN:
    "Le partenaire WEB ne peut pas appeler /wallet. Utilisez la clé d'un partenaire métier (ex. WAVE).",
};

export function resolveWalletErrorMessage(
  error: unknown,
  fallback = "Opération wallet impossible",
): string {
  if (error instanceof ApiError) {
    const mapped = error.code ? WALLET_ERROR_MESSAGES[error.code] : undefined;
    if (error.code === "WALLET_LINK_FAILED") {
      return error.message || mapped || fallback;
    }
    if (mapped) return mapped;
    if (error.code && error.message) return `${error.code} — ${error.message}`;
    if (error.message) return error.message;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
