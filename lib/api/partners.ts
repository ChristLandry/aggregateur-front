"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut, apiPatch } from "./client";
import { notifyError, notifySuccess } from "./notify";
import type { Partner, PartnerAccount } from "./types";
import {
  mapPartner,
  mapPartnerAccount,
  mapPartnerBalance,
  toCreatePartnerBody,
  toUpdatePartnerBody,
  type ApiPartnerDto,
  type ApiPartnerAccountDto,
  type ApiPartnerBalanceDto,
} from "./mappers";
import { PartnerStatus, PartnerStatusLabel } from "@/lib/enums";
import { usePartnerStore } from "@/lib/partner/store";

export const partnersKeys = {
  all: ["partners"] as const,
  list: () => [...partnersKeys.all, "list"] as const,
  allowedCodes: () => [...partnersKeys.all, "allowed-codes"] as const,
  detail: (id: string) => [...partnersKeys.all, "detail", id] as const,
  account: (id: string) => [...partnersKeys.all, "account", id] as const,
  balance: (id: string) => [...partnersKeys.all, "balance", id] as const,
};

/** Codes enum autorisés à la création (GET public, sans clé partenaire). */
export function usePartnerAllowedCodes(enabled = true) {
  return useQuery({
    queryKey: partnersKeys.allowedCodes(),
    queryFn: async () => apiGet<string[]>("/api/v1/partners/allowed-codes"),
    enabled,
    staleTime: 60_000,
  });
}

export function usePartners() {
  return useQuery({
    queryKey: partnersKeys.list(),
    queryFn: async () => {
      const rows = await apiGet<ApiPartnerDto[]>("/api/v1/partners");
      const partners = (Array.isArray(rows) ? rows : []).map((r) => mapPartner(r));

      // PartnerDto n'embarque pas le solde → GET /partners/{id}/balance
      return Promise.all(
        partners.map(async (p) => {
          if (!p.id) return p;
          try {
            const bal = await apiGet<ApiPartnerBalanceDto>(
              `/api/v1/partners/${p.id}/balance`,
            );
            const mapped = mapPartnerBalance(bal);
            return {
              ...p,
              balance: mapped.balance,
              currency: mapped.currency || p.currency,
            };
          } catch {
            return p;
          }
        }),
      );
    },
    meta: { errorFallback: "Impossible de charger les partenaires" },
  });
}

export function usePartner(id: string | undefined) {
  return useQuery({
    queryKey: partnersKeys.detail(id ?? ""),
    queryFn: async () => {
      const dto = await apiGet<ApiPartnerDto>(`/api/v1/partners/${id}`);
      const partner = mapPartner(dto);
      try {
        const bal = await apiGet<ApiPartnerBalanceDto>(
          `/api/v1/partners/${id}/balance`,
        );
        const mapped = mapPartnerBalance(bal);
        return {
          ...partner,
          balance: mapped.balance,
          currency: mapped.currency || partner.currency,
        };
      } catch {
        return partner;
      }
    },
    enabled: !!id,
    meta: { errorFallback: "Impossible de charger le partenaire" },
  });
}

export function usePartnerAccount(id: string | undefined) {
  return useQuery({
    queryKey: partnersKeys.account(id ?? ""),
    queryFn: async () => {
      const dto = await apiGet<ApiPartnerAccountDto>(`/api/v1/partners/${id}/account`);
      return mapPartnerAccount(dto);
    },
    enabled: !!id,
    meta: { errorFallback: "Impossible de charger le compte partenaire" },
  });
}

export function usePartnerBalance(id: string | undefined) {
  return useQuery({
    queryKey: partnersKeys.balance(id ?? ""),
    queryFn: async () => {
      const dto = await apiGet<ApiPartnerBalanceDto>(`/api/v1/partners/${id}/balance`);
      return mapPartnerBalance(dto);
    },
    enabled: !!id,
    meta: { errorFallback: "Impossible de charger le solde" },
  });
}

export interface CreatePartnerResult {
  partner: Partner;
  apiKey: string;
}

export function useCreatePartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<Partner>): Promise<CreatePartnerResult> => {
      const created = await apiPost<{ partnerId: string; partnerCode: string; apiKey: string }>(
        "/api/v1/partners",
        toCreatePartnerBody(body),
      );
      const apiKey = created.apiKey ?? "";
      const partner = mapPartner({
        partnerId: created.partnerId,
        partnerCode: created.partnerCode,
        name: body.name ?? created.partnerCode,
        baseUrl: body.baseUrl ?? "",
        accountCode: body.accountCode,
        status: 1,
        currency: body.currency ?? "XOF",
        contactEmail: body.contactEmail,
        contactPhone: body.contactPhone,
        lowBalanceThresholdPercent: body.lowBalanceThresholdPercent ?? null,
        lowBalanceReferenceAmount: body.lowBalanceReferenceAmount ?? null,
        alertChannels: body.alertChannels ?? null,
        createdAt: new Date().toISOString(),
      });
      if (apiKey && partner.id) {
        usePartnerStore.getState().registerPartnerApiKey(
          partner.id,
          partner.code,
          apiKey,
        );
      }
      return { partner, apiKey };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: partnersKeys.list() });
      notifySuccess("Partenaire créé");
    },
    onError: (e) => notifyError(e, "Création du partenaire impossible"),
  });
}

export function useUpdatePartner(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Partner>) => {
      await apiPut<void>(`/api/v1/partners/${id}`, toUpdatePartnerBody(patch));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: partnersKeys.detail(id) });
      qc.invalidateQueries({ queryKey: partnersKeys.list() });
      notifySuccess("Partenaire mis à jour");
    },
    onError: (e) => notifyError(e, "Mise à jour du partenaire impossible"),
  });
}

export function useChangePartnerStatus(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: number) =>
      apiPatch<void>(`/api/v1/partners/${id}/status`, { status }),
    onSuccess: (_data, status) => {
      qc.invalidateQueries({ queryKey: partnersKeys.detail(id) });
      qc.invalidateQueries({ queryKey: partnersKeys.list() });
      const label =
        PartnerStatusLabel[status as PartnerStatus] ?? String(status);
      notifySuccess(`Statut partenaire mis à jour : ${label}`);
    },
    onError: (e) => notifyError(e, "Changement de statut impossible"),
  });
}

export interface RotateApiKeyResult {
  apiKey: string;
}

export function useRotatePartnerKey(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<RotateApiKeyResult> => {
      const r = await apiPost<{ apiKey?: string; ApiKey?: string }>(
        `/api/v1/partners/${id}/rotate-key`,
      );
      const apiKey = r.apiKey ?? r.ApiKey ?? "";
      if (!apiKey) {
        throw new Error("Le serveur n'a pas renvoyé la clé API");
      }
      const partner = await apiGet<ApiPartnerDto>(`/api/v1/partners/${id}`);
      const mapped = mapPartner(partner);
      usePartnerStore.getState().registerPartnerApiKey(id, mapped.code, apiKey);
      return { apiKey };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: partnersKeys.detail(id) });
      notifySuccess("Nouvelle clé API générée");
    },
    onError: (e) => notifyError(e, "Renouvellement de la clé impossible"),
  });
}

export function useSetPartnerBalance(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { balance: number; reason?: string }) =>
      apiPut<ApiPartnerBalanceDto>(`/api/v1/partners/${id}/balance`, body).then(mapPartnerBalance),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: partnersKeys.balance(id) });
      qc.invalidateQueries({ queryKey: partnersKeys.account(id) });
      qc.invalidateQueries({ queryKey: partnersKeys.detail(id) });
      qc.invalidateQueries({ queryKey: partnersKeys.list() });
      notifySuccess("Solde mis à jour");
    },
    onError: (e) => notifyError(e, "Mise à jour du solde impossible"),
  });
}
