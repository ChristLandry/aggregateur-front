"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch } from "./client";
import { notifyError, notifySuccess } from "./notify";
import type { Subscription } from "./types";
import {
  mapSubscription,
  toCreateSubscriptionBody,
  type ApiSubscriptionDto,
} from "./mappers";
import { useAuthStore } from "@/lib/auth/store";
import type { SubscriptionFormValues } from "@/lib/schemas/subscription";
import { SubscriptionStatus, SubscriptionStatusLabel } from "@/lib/enums";

export const subscriptionsKeys = {
  all: ["subscriptions"] as const,
  list: (customerId?: string | null) => [...subscriptionsKeys.all, "list", customerId ?? null] as const,
  detail: (id: string) => [...subscriptionsKeys.all, "detail", id] as const,
};

export function useSubscriptions(customerId?: string | null) {
  return useQuery({
    queryKey: subscriptionsKeys.list(customerId),
    queryFn: async () => {
      const url = customerId
        ? `/api/v1/subscriptions?customerId=${encodeURIComponent(customerId)}`
        : "/api/v1/subscriptions";
      const rows = await apiGet<ApiSubscriptionDto[]>(url);
      return rows.map(mapSubscription);
    },
    meta: { errorFallback: "Impossible de charger les souscriptions" },
  });
}

export function useSubscription(id: string | undefined) {
  return useQuery({
    queryKey: subscriptionsKeys.detail(id ?? ""),
    queryFn: async () => {
      const dto = await apiGet<ApiSubscriptionDto>(`/api/v1/subscriptions/${id}`);
      return mapSubscription(dto);
    },
    enabled: !!id,
    meta: { errorFallback: "Impossible de charger la souscription" },
  });
}

export function useCreateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: SubscriptionFormValues) => {
      const partnerId = useAuthStore.getState().partnerId;
      if (!partnerId) {
        throw new Error("Partenaire requis pour créer une souscription");
      }
      const subId = await apiPost<string>(
        "/api/v1/subscriptions",
        toCreateSubscriptionBody(values, partnerId),
      );
      const dto = await apiGet<ApiSubscriptionDto>(`/api/v1/subscriptions/${subId}`);
      return mapSubscription(dto);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: subscriptionsKeys.all });
      notifySuccess("Souscription créée");
    },
    onError: (e) => notifyError(e, "Création de la souscription impossible"),
  });
}

export function useChangeSubscriptionStatus(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: number) =>
      apiPatch<void>(`/api/v1/subscriptions/${id}/status`, { status }),
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
