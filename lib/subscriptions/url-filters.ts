import {
  SUBSCRIPTION_STATUS_ALL,
  type SubscriptionSearchFilters,
  type SubscriptionStatusFilter,
} from "@/lib/api/subscriptions";
import {
  DEFAULT_WEB_SUBSCRIPTION_TAKE,
  SUBSCRIPTION_PARTNER_WEB,
} from "@/lib/subscriptions/constants";

function parseStatusParam(raw: string | null): SubscriptionStatusFilter | undefined {
  if (raw === null || raw === "") return undefined;
  if (raw === SUBSCRIPTION_STATUS_ALL) return SUBSCRIPTION_STATUS_ALL;
  const n = Number(raw);
  return Number.isNaN(n) ? undefined : n;
}

function parseTakeParam(raw: string | null): number | undefined {
  if (raw === null || raw === "") return undefined;
  const n = Number(raw);
  return Number.isNaN(n) || n < 1 ? undefined : n;
}

export function filtersFromSearchParams(
  sp: URLSearchParams,
): SubscriptionSearchFilters {
  const partnerScope = sp.get("partnerScope") || sp.get("partnerId") || SUBSCRIPTION_PARTNER_WEB;
  const take = parseTakeParam(sp.get("take"));
  return {
    partnerScope,
    customerId: sp.get("customerId") || undefined,
    phoneNumber: sp.get("phoneNumber") || undefined,
    bankAccountNumber: sp.get("bankAccountNumber") || undefined,
    phoneOperator: sp.get("phoneOperator") || undefined,
    subscribedAtDebut: sp.get("subscribedAtDebut") || undefined,
    subscribedAtFin: sp.get("subscribedAtFin") || undefined,
    status: parseStatusParam(sp.get("status")),
    take:
      take ??
      (partnerScope === SUBSCRIPTION_PARTNER_WEB ? DEFAULT_WEB_SUBSCRIPTION_TAKE : undefined),
  };
}

export function searchParamsFromFilters(
  filters: SubscriptionSearchFilters,
): URLSearchParams {
  const sp = new URLSearchParams();
  const partnerScope = filters.partnerScope ?? SUBSCRIPTION_PARTNER_WEB;
  sp.set("partnerScope", partnerScope);
  if (filters.customerId) sp.set("customerId", filters.customerId);
  if (filters.phoneNumber) sp.set("phoneNumber", filters.phoneNumber);
  if (filters.bankAccountNumber) sp.set("bankAccountNumber", filters.bankAccountNumber);
  if (filters.phoneOperator) sp.set("phoneOperator", filters.phoneOperator);
  if (filters.subscribedAtDebut) {
    sp.set("subscribedAtDebut", filters.subscribedAtDebut.split("T")[0] ?? filters.subscribedAtDebut);
  }
  if (filters.subscribedAtFin) {
    sp.set("subscribedAtFin", filters.subscribedAtFin.split("T")[0] ?? filters.subscribedAtFin);
  }
  if (filters.status === SUBSCRIPTION_STATUS_ALL) {
    sp.set("status", SUBSCRIPTION_STATUS_ALL);
  } else if (typeof filters.status === "number") {
    sp.set("status", String(filters.status));
  }
  if (filters.take) sp.set("take", String(filters.take));
  return sp;
}
