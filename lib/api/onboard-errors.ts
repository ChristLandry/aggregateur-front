import { ApiError } from "./client";

export const ONBOARD_ERROR_MESSAGES: Record<string, string> = {
  PARTNER_NOT_FOUND: "Partenaire introuvable. Rafraîchissez la liste des partenaires.",
  PARTNER_INACTIVE: "Le partenaire est désactivé. Activez-le d'abord.",
  BANK_KYC_FAILED:
    "Échec de la vérification KYC bancaire. Vérifiez le compte bancaire et réessayez.",
  WALLET_KYC_FAILED:
    "Échec de la vérification KYC wallet. Vérifiez le téléphone et le code OTP, puis réessayez.",
  KYC_MISMATCH:
    "Les données KYC banque et wallet ne correspondent pas.",
  WALLET_LINK_FAILED:
    "Échec de la liaison wallet / compte bancaire. Vérifiez le code OTP.",
  SUBSCRIPTION_DUPLICATE:
    "Une souscription active existe déjà pour ce compte et ce téléphone.",
  PARTNER_APIKEY_MISSING:
    "Clé API manquante pour lancer l'onboarding.",
  VALIDATION_ERROR: "Requête invalide — vérifiez les champs saisis.",
  ONBOARD_INVALID_RESPONSE: "Réponse serveur inattendue après onboarding.",
  NETWORK_ERROR:
    "Connexion interrompue. Si l'API a répondu OK, la souscription existe peut‑être déjà — consultez la liste.",
  TIMEOUT:
    "Délai dépassé. L'onboarding a souvent déjà réussi côté API — vérifiez la liste des souscriptions.",
  BACKEND_UNAVAILABLE:
    "Backend injoignable via le proxy. Vérifiez https://localhost:44302 et API_PROXY_TARGET.",
  CLIENT_NOT_FOUND: "Client introuvable.",
  KYC_NOT_FOUND: "Aucun abonnement pour ce numéro chez ce partenaire.",
};

export function resolveOnboardErrorMessage(
  error: unknown,
  fallback = "L'onboarding a échoué",
): string {
  if (error instanceof ApiError) {
    const mapped = error.code ? ONBOARD_ERROR_MESSAGES[error.code] : undefined;
    if (
      error.code === "KYC_MISMATCH" ||
      error.code === "BANK_KYC_FAILED" ||
      error.code === "WALLET_KYC_FAILED" ||
      error.code === "WALLET_LINK_FAILED"
    ) {
      return error.message || mapped || fallback;
    }
    if (mapped) return mapped;
    if (error.code && error.message) return `${error.code} — ${error.message}`;
    if (error.message) return error.message;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

/** Extrait les champs en désaccord depuis le message KYC_MISMATCH. */
export function parseKycMismatchFields(message: string | undefined): string[] {
  if (!message) return [];
  const match = message.match(/differ on:\s*(.+?)\.?$/i);
  if (!match?.[1]) return [];
  return match[1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export const KYC_FIELD_LABELS: Record<string, string> = {
  phoneNumber: "Téléphone",
  dateOfBirth: "Date de naissance",
  nationalId: "Pièce d'identité",
};
