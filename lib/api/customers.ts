"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut } from "./client";
import { notifyError, notifySuccess } from "./notify";
import type { Customer } from "./types";
import {
  mapCustomer,
  mapSubscription,
  toCreateCustomerBody,
  toCreateSubscriptionBody,
  toUpdateCustomerBody,
  type ApiCustomerDto,
  type ApiSubscriptionDto,
} from "./mappers";
import { usePartnerStore } from "@/lib/partner/store";
import { hasPartnerApiContext, useHasPartnerApiContext } from "@/lib/partner/context";
import type { CustomerFormValues } from "@/lib/schemas/customer";
import type { SubscriptionFormValues } from "@/lib/schemas/subscription";
import {
  resolveApiKeyForPartnerScope,
  subscriptionsKeys,
  useSearchSubscriptions,
} from "./subscriptions";
import { SUBSCRIPTION_PARTNER_WEB } from "@/lib/subscriptions/constants";
import {
  CustomerStatus,
  CustomerStatusLabel,
  KycStatus,
  KycStatusLabel,
} from "@/lib/enums";

export const customersKeys = {
  all: ["customers"] as const,
  list: (partnerId?: string | null) => [...customersKeys.all, "list", partnerId ?? null] as const,
  detail: (id: string) => [...customersKeys.all, "detail", id] as const,
  subscriptions: (id: string) => [...customersKeys.all, "subs", id] as const,
};

export function useCustomers() {
  const partnerId = usePartnerStore((s) => s.currentPartner?.partnerId);
  const hasContext = useHasPartnerApiContext();
  return useQuery({
    queryKey: customersKeys.list(partnerId),
    queryFn: async () => {
      const rows = await apiGet<ApiCustomerDto[]>("/api/v1/customers");
      return rows.map(mapCustomer);
    },
    enabled: hasContext,
    meta: { errorFallback: "Impossible de charger la liste des clients" },
  });
}

export function useCustomer(id: string | undefined) {
  const hasContext = useHasPartnerApiContext();
  return useQuery({
    queryKey: customersKeys.detail(id ?? ""),
    queryFn: async () => {
      const dto = await apiGet<ApiCustomerDto>(`/api/v1/customers/${id}`);
      return mapCustomer(dto);
    },
    enabled: !!id && hasContext,
    meta: { errorFallback: "Impossible de charger le client" },
  });
}

export function useCustomerSubscriptions(id: string | undefined) {
  return useSearchSubscriptions(
    { partnerScope: SUBSCRIPTION_PARTNER_WEB, customerId: id },
    { enabled: !!id },
  );
}

function customerUpdateSuccessMessage(patch: Partial<Customer>): string {
  if (patch.status !== undefined) {
    const label =
      CustomerStatusLabel[patch.status as CustomerStatus] ?? String(patch.status);
    return `Statut client mis à jour : ${label}`;
  }
  if (patch.kycStatus !== undefined) {
    const label = KycStatusLabel[patch.kycStatus as KycStatus] ?? String(patch.kycStatus);
    return `KYC mis à jour : ${label}`;
  }
  return "Client mis à jour";
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<CustomerFormValues>) => {
      if (!hasPartnerApiContext()) {
        throw new Error(
          "Sélectionnez un partenaire dans la topbar pour créer un client.",
        );
      }
      const customerId = await apiPost<string>(
        "/api/v1/customers",
        toCreateCustomerBody(values),
      );
      const dto = await apiGet<ApiCustomerDto>(`/api/v1/customers/${customerId}`);
      return mapCustomer(dto);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customersKeys.all });
      notifySuccess("Client créé");
    },
    onError: (e) => notifyError(e, "Création du client impossible"),
  });
}

export function useUpdateCustomer(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Customer>) => {
      await apiPut<void>(`/api/v1/customers/${id}`, toUpdateCustomerBody(patch));
      return patch;
    },
    onSuccess: (patch) => {
      qc.invalidateQueries({ queryKey: customersKeys.detail(id) });
      qc.invalidateQueries({ queryKey: customersKeys.all });
      notifySuccess(customerUpdateSuccessMessage(patch));
    },
    onError: (e) => notifyError(e, "Mise à jour du client impossible"),
  });
}

export function useCreateCustomerSubscription(customerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: SubscriptionFormValues) => {
      const apiKey = resolveApiKeyForPartnerScope(SUBSCRIPTION_PARTNER_WEB);
      if (!apiKey) {
        throw new Error("Clé API partenaire manquante.");
      }
      const subId = await apiPost<string>(
        "/api/v1/subscriptions",
        toCreateSubscriptionBody({
          ...values,
          customerId: values.customerId || customerId,
        }),
        { headers: { "X-Partner-ApiKey": apiKey } },
      );
      const dto = await apiGet<ApiSubscriptionDto>(`/api/v1/subscriptions/${subId}`);
      return mapSubscription(dto);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customersKeys.subscriptions(customerId) });
      qc.invalidateQueries({ queryKey: subscriptionsKeys.all });
      notifySuccess("Souscription créée");
    },
    onError: (e) => notifyError(e, "Création de la souscription impossible"),
  });
}
