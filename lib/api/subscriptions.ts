"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, ApiError } from "./client";
import { notifyError, notifySuccess } from "./notify";
import type { Subscription } from "./types";
import {
  mapPartner,
  mapSubscription,
  toCreateSubscriptionBody,
  type ApiPartnerDto,
  type ApiSubscriptionDto,
} from "./mappers";
import { getWebPartnerApiKey } from "@/lib/partner/api-key";
import { usePartnerStore } from "@/lib/partner/store";
import { WEB_PARTNER_CODE } from "@/lib/partner/constants";
import type { SubscriptionFormValues } from "@/lib/schemas/subscription";
import { SubscriptionStatus, SubscriptionStatusLabel } from "@/lib/enums";
import {
  DEFAULT_WEB_SUBSCRIPTION_TAKE,
  isWebPartnerScope,
  SUBSCRIPTION_PARTNER_WEB,
} from "@/lib/subscriptions/constants";

export const subscriptionsKeys = {
  all: ["subscriptions"] as const,
  search: (filters: SubscriptionSearchFilters) =>
    [...subscriptionsKeys.all, "search", filters] as const,
  detail: (id: string) => [...subscriptionsKeys.all, id] as const,
};

export const SUBSCRIPTION_STATUS_ALL = "all" as const;

export type SubscriptionStatusFilter = number | typeof SUBSCRIPTION_STATUS_ALL;

/** Filtres GET /api/v1/subscriptions (aligné SubscriptionController). */
export interface SubscriptionSearchFilters {
  /** `web` ou UUID partenaire métier. */
  partnerScope?: string;
  customerId?: string;
  subscribedAtDebut?: string;
  subscribedAtFin?: string;
  phoneNumber?: string;
  bankAccountNumber?: string;
  phoneOperator?: string;
  status?: SubscriptionStatusFilter;
  take?: number;
}

function toApiDateTime(date: string, endOfDay = false): string {
  if (!date) return date;
  if (date.includes("T")) return date;
  return endOfDay ? `${date}T23:59:59` : `${date}T00:00:00`;
}

/** Applique les défauts (WEB + take 5000). */
export function normalizeSubscriptionFilters(
  filters: SubscriptionSearchFilters = {},
): SubscriptionSearchFilters {
  const partnerScope = filters.partnerScope ?? SUBSCRIPTION_PARTNER_WEB;
  const isWeb = isWebPartnerScope(partnerScope);
  return {
    ...filters,
    partnerScope,
    subscribedAtDebut: filters.subscribedAtDebut
      ? toApiDateTime(filters.subscribedAtDebut, false)
      : undefined,
    subscribedAtFin: filters.subscribedAtFin
      ? toApiDateTime(filters.subscribedAtFin, true)
      : undefined,
    take: filters.take ?? (isWeb ? DEFAULT_WEB_SUBSCRIPTION_TAKE : undefined),
  };
}

export function resolveApiKeyForPartnerScope(
  partnerScope?: string,
): string | undefined {
  if (isWebPartnerScope(partnerScope)) {
    return getWebPartnerApiKey();
  }
  return (
    usePartnerStore.getState().getApiKey(partnerScope!) ?? getWebPartnerApiKey()
  );
}

export function buildSubscriptionsUrl(
  filters: SubscriptionSearchFilters = {},
): string {
  const sp = new URLSearchParams();
  if (filters.partnerScope && !isWebPartnerScope(filters.partnerScope)) {
    sp.set("partnerId", filters.partnerScope);
  }
  if (filters.subscribedAtDebut) sp.set("subscribedAtDebut", filters.subscribedAtDebut);
  if (filters.subscribedAtFin) sp.set("subscribedAtFin", filters.subscribedAtFin);
  if (filters.phoneNumber) sp.set("phoneNumber", filters.phoneNumber);
  if (filters.bankAccountNumber) sp.set("bankAccountNumber", filters.bankAccountNumber);
  if (filters.customerId) sp.set("customerId", filters.customerId);
  if (filters.phoneOperator) sp.set("phoneOperator", filters.phoneOperator);
  if (typeof filters.status === "number") sp.set("status", String(filters.status));
  if (filters.take) sp.set("take", String(filters.take));
  const qs = sp.toString();
  return qs ? `/api/v1/subscriptions?${qs}` : "/api/v1/subscriptions";
}

async function fetchSubscriptionRows(
  filters: SubscriptionSearchFilters,
  status: number,
  apiKey: string,
): Promise<ApiSubscriptionDto[]> {
  const rows = await apiGet<ApiSubscriptionDto[]>(
    buildSubscriptionsUrl({ ...filters, status }),
    { headers: { "X-Partner-ApiKey": apiKey } },
  );
  return Array.isArray(rows) ? rows : [];
}

/** GET /api/v1/subscriptions — clé API selon le partenaire choisi dans les filtres. */
export async function listSubscriptions(
  filters: SubscriptionSearchFilters = {},
): Promise<Subscription[]> {
  const normalized = normalizeSubscriptionFilters(filters);
  const apiKey = resolveApiKeyForPartnerScope(normalized.partnerScope);
  if (!apiKey) {
    throw new ApiError(
      isWebPartnerScope(normalized.partnerScope)
        ? "Clé WEB manquante (NEXT_PUBLIC_WEB_PARTNER_APIKEY)."
        : "Clé API absente pour ce partenaire. Effectuez une rotation depuis Partenaires.",
      "PARTNER_APIKEY_MISSING",
    );
  }

  const { status, partnerScope: _ps, ...apiFilters } = normalized;
  const isWeb = isWebPartnerScope(normalized.partnerScope);
  const maxTake = normalized.take ?? (isWeb ? DEFAULT_WEB_SUBSCRIPTION_TAKE : undefined);

  const statusesToFetch: number[] =
    status === SUBSCRIPTION_STATUS_ALL || status === undefined
      ? [
          SubscriptionStatus.Inactive,
          SubscriptionStatus.Active,
          SubscriptionStatus.Suspended,
        ]
      : [status];

  async function collectForScope(partnerScope: string): Promise<Subscription[]> {
    const seen = new Set<string>();
    const rows: Subscription[] = [];
    for (const s of statusesToFetch) {
      const dtos = await fetchSubscriptionRows(
        { ...apiFilters, partnerScope, take: maxTake },
        s,
        apiKey!,
      );
      for (const dto of dtos) {
        const sub = mapSubscription(dto);
        if (!sub.id || seen.has(sub.id)) continue;
        seen.add(sub.id);
        rows.push(sub);
      }
    }
    return rows;
  }

  // Partenaire métier : une seule requête filtrée.
  if (!isWeb) {
    const rows = await collectForScope(normalized.partnerScope!);
    return maxTake ? rows.slice(0, maxTake) : rows;
  }

  // Mode WEB :
  // 1) Appel global (back MAJ : sans partnerId = toutes les souscriptions)
  const globalRows = await collectForScope(SUBSCRIPTION_PARTNER_WEB);
  if (globalRows.length > 0) {
    return maxTake ? globalRows.slice(0, maxTake) : globalRows;
  }

  // 2) Fallback : fan-out sur chaque partenaire métier (compat back ancien)
  const partnerDtos = await apiGet<ApiPartnerDto[]>("/api/v1/partners");
  const partnerIds = (Array.isArray(partnerDtos) ? partnerDtos : [])
    .map(mapPartner)
    .filter(
      (p) => !!p.id && p.code?.toUpperCase() !== WEB_PARTNER_CODE,
    )
    .map((p) => p.id);

  if (partnerIds.length === 0) return globalRows;

  const seen = new Set<string>();
  const merged: Subscription[] = [];
  for (const partnerId of partnerIds) {
    const rows = await collectForScope(partnerId);
    for (const sub of rows) {
      if (!sub.id || seen.has(sub.id)) continue;
      seen.add(sub.id);
      merged.push(sub);
      if (maxTake && merged.length >= maxTake) {
        return merged.slice(0, maxTake);
      }
    }
  }

  return merged;
}

export function useSearchSubscriptions(
  filters: SubscriptionSearchFilters = {},
  options?: { enabled?: boolean },
) {
  const normalized = normalizeSubscriptionFilters(filters);
  const apiKey = resolveApiKeyForPartnerScope(normalized.partnerScope);
  const enabled = (options?.enabled ?? true) && !!apiKey;
  return useQuery({
    queryKey: subscriptionsKeys.search(normalized),
    queryFn: () => listSubscriptions(normalized),
    enabled,
    meta: { errorFallback: "Impossible de charger les souscriptions" },
  });
}

/** @deprecated Préférer useSearchSubscriptions. */
export function useSubscriptions(customerId?: string | null) {
  return useSearchSubscriptions({
    partnerScope: SUBSCRIPTION_PARTNER_WEB,
    customerId: customerId || undefined,
  });
}

export function useSubscription(id: string | undefined) {
  const apiKey = resolveApiKeyForPartnerScope(SUBSCRIPTION_PARTNER_WEB);
  return useQuery({
    queryKey: subscriptionsKeys.detail(id ?? ""),
    queryFn: async () => {
      const dto = await apiGet<ApiSubscriptionDto>(`/api/v1/subscriptions/${id}`, {
        headers: apiKey ? { "X-Partner-ApiKey": apiKey } : undefined,
      });
      return mapSubscription(dto);
    },
    enabled: !!id && !!apiKey,
    meta: { errorFallback: "Impossible de charger la souscription" },
  });
}

export function useCreateSubscription(partnerScope?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: SubscriptionFormValues) => {
      const scope = partnerScope ?? SUBSCRIPTION_PARTNER_WEB;
      const apiKey = resolveApiKeyForPartnerScope(scope);
      if (!apiKey) {
        throw new ApiError("Clé API partenaire manquante.", "PARTNER_APIKEY_MISSING");
      }
      const subId = await apiPost<string>(
        "/api/v1/subscriptions",
        toCreateSubscriptionBody(values),
        { headers: { "X-Partner-ApiKey": apiKey } },
      );
      const dto = await apiGet<ApiSubscriptionDto>(`/api/v1/subscriptions/${subId}`, {
        headers: { "X-Partner-ApiKey": apiKey },
      });
      return mapSubscription(dto);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: subscriptionsKeys.all });
      notifySuccess("Souscription créée");
    },
    onError: (e) => notifyError(e, "Création de la souscription impossible"),
  });
}

export function useChangeSubscriptionStatus(id: string, partnerScope?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (status: number) => {
      const apiKey = resolveApiKeyForPartnerScope(
        partnerScope ?? SUBSCRIPTION_PARTNER_WEB,
      );
      return apiPatch<void>(
        `/api/v1/subscriptions/${id}/status`,
        { status },
        apiKey ? { headers: { "X-Partner-ApiKey": apiKey } } : undefined,
      );
    },
    onSuccess: (_data, status) => {
      qc.invalidateQueries({ queryKey: subscriptionsKeys.detail(id) });
      qc.invalidateQueries({ queryKey: subscriptionsKeys.all });
      const label =
        SubscriptionStatusLabel[status as SubscriptionStatus] ?? String(status);
      notifySuccess(`Statut souscription mis à jour : ${label}`);
    },
    onError: (e) => notifyError(e, "Changement de statut impossible"),
  });
}
