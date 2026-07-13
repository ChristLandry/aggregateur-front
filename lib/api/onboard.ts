"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPost, ApiError } from "./client";
import { getWebPartnerApiKey } from "@/lib/partner/api-key";
import { usePartnerStore } from "@/lib/partner/store";
import type { OnboardFormValues } from "@/lib/schemas/onboard";
import { subscriptionsKeys } from "./subscriptions";
import { clientsKeys } from "./clients";

export interface OnboardCustomerResponse {
  clientId: string;
  customerId: string;
  subscriptionId: string;
  linkId?: string | null;
  status: string;
}

type ApiOnboardDto = {
  clientId?: string;
  ClientId?: string;
  customerId?: string;
  CustomerId?: string;
  subscriptionId?: string;
  SubscriptionId?: string;
  linkId?: string | null;
  LinkId?: string | null;
  status?: string;
  Status?: string;
};

function mapOnboardResponse(dto: ApiOnboardDto): OnboardCustomerResponse {
  return {
    clientId: String(dto.clientId ?? dto.ClientId ?? ""),
    customerId: String(dto.customerId ?? dto.CustomerId ?? ""),
    subscriptionId: String(dto.subscriptionId ?? dto.SubscriptionId ?? ""),
    linkId: (dto.linkId ?? dto.LinkId) ?? null,
    status: String(dto.status ?? dto.Status ?? "SUCCESS"),
  };
}

/**
 * Body aligné Swagger / OnboardCustomerRequest :
 * { bankAccount, phoneNumber, bankAccountRoot, walletTemporalyCode, partnerId }
 */
export function toOnboardBody(values: OnboardFormValues) {
  return {
    bankAccount: values.bankAccount.trim(),
    phoneNumber: values.phoneNumber.trim(),
    bankAccountRoot: values.bankAccountRoot.trim(),
    walletTemporalyCode: values.walletTemporalyCode.trim(),
    partnerId: values.partnerId,
  };
}

/**
 * Onboarding admin : la clé WEB authentifie le contexte partenaire ;
 * le partenaire métier est porté par `partnerId` dans le body.
 */
function resolveOnboardApiKey(partnerId: string): string | undefined {
  return getWebPartnerApiKey() || usePartnerStore.getState().getApiKey(partnerId);
}

/** POST /api/v1/subscriptions/onboard */
export function useOnboardCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: OnboardFormValues) => {
      const apiKey = resolveOnboardApiKey(values.partnerId);
      if (!apiKey) {
        throw new ApiError(
          "Clé API manquante. Configurez NEXT_PUBLIC_WEB_PARTNER_APIKEY ou faites une rotation de clé pour ce partenaire.",
          "PARTNER_APIKEY_MISSING",
        );
      }

      const body = toOnboardBody(values);
      const dto = await apiPost<ApiOnboardDto>(
        "/api/v1/subscriptions/onboard",
        body,
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-Partner-ApiKey": apiKey,
          },
          timeout: 60_000,
        },
      );
      const mapped = mapOnboardResponse(dto);
      if (!mapped.subscriptionId) {
        throw new ApiError(
          "Réponse onboard invalide (subscriptionId manquant).",
          "ONBOARD_INVALID_RESPONSE",
        );
      }
      return mapped;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: subscriptionsKeys.all });
      qc.invalidateQueries({ queryKey: clientsKeys.all });
    },
  });
}
