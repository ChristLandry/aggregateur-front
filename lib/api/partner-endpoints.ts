"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPost, apiPut } from "./client";
import { notifyError, notifySuccess } from "./notify";
import {
  mapPartnerEndpoint,
  type ApiPartnerEndpointDto,
} from "./mappers";
import type { PartnerEndpoint } from "./types";

export const partnerEndpointsKeys = {
  all: ["partner-endpoints"] as const,
  list: (partnerId?: string | null) =>
    [...partnerEndpointsKeys.all, "list", partnerId ?? null] as const,
  detail: (id: string) => [...partnerEndpointsKeys.all, "detail", id] as const,
};

function buildListUrl(partnerId?: string | null): string {
  if (!partnerId) return "/api/v1/partner-endpoints";
  return `/api/v1/partner-endpoints?partnerId=${encodeURIComponent(partnerId)}`;
}

/**
 * Lists all partner endpoints, optionally filtered by partnerId.
 * Returns the *domain* shape (mapped from the DTO).
 */
export function usePartnerEndpoints(partnerId?: string | null) {
  return useQuery({
    queryKey: partnerEndpointsKeys.list(partnerId),
    queryFn: async () => {
      const rows = await apiGet<ApiPartnerEndpointDto[]>(buildListUrl(partnerId));
      return (rows ?? []).map(mapPartnerEndpoint);
    },
  });
}

export function usePartnerEndpoint(id: string | undefined) {
  return useQuery({
    queryKey: partnerEndpointsKeys.detail(id ?? ""),
    queryFn: async () => {
      const dto = await apiGet<ApiPartnerEndpointDto>(`/api/v1/partner-endpoints/${id}`);
      return mapPartnerEndpoint(dto);
    },
    enabled: !!id,
  });
}

export interface CreatePartnerEndpointInput {
  partnerId: string;
  endpointKey: number;
  /** Optionally attach a schema on creation. */
  schemaId?: string;
}

export function useCreatePartnerEndpoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreatePartnerEndpointInput) => {
      // POST renvoie Guid, pas le DTO complet
      const id = await apiPost<string>("/api/v1/partner-endpoints", body);
      const dto = await apiGet<ApiPartnerEndpointDto>(
        `/api/v1/partner-endpoints/${id}`,
      );
      return mapPartnerEndpoint(dto);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: partnerEndpointsKeys.all });
      notifySuccess("Endpoint activé");
    },
    onError: (e) => notifyError(e, "Activation impossible"),
  });
}

export function useDeletePartnerEndpoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiDelete<void>(`/api/v1/partner-endpoints/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: partnerEndpointsKeys.all });
      notifySuccess("Endpoint désactivé");
    },
    onError: (e) => notifyError(e, "Désactivation impossible"),
  });
}

export interface AttachSchemaInput {
  id: string;
  schemaId: string;
}

export function useAttachSchema() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, schemaId }: AttachSchemaInput) => {
      // PUT .../schema renvoie ApiResponse sans data — recharger le détail
      await apiPut<void>(`/api/v1/partner-endpoints/${id}/schema`, {
        schemaId,
      });
      const dto = await apiGet<ApiPartnerEndpointDto>(
        `/api/v1/partner-endpoints/${id}`,
      );
      return mapPartnerEndpoint(dto);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: partnerEndpointsKeys.all });
      notifySuccess("Schéma rattaché");
    },
    onError: (e) => notifyError(e, "Rattachement impossible"),
  });
}

export function useDetachSchema() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiDelete<void>(`/api/v1/partner-endpoints/${id}/schema`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: partnerEndpointsKeys.all });
      notifySuccess("Schéma détaché");
    },
    onError: (e) => notifyError(e, "Détachement impossible"),
  });
}

/**
 * Builds a Map keyed by `${partnerId}:${endpointKey}` so the matrix page
 * can look up a cell in O(1).
 */
export function indexEndpointsByCell(
  endpoints: PartnerEndpoint[] | undefined,
): Map<string, PartnerEndpoint> {
  const map = new Map<string, PartnerEndpoint>();
  for (const e of endpoints ?? []) {
    map.set(`${e.partnerId}:${e.endpointKey}`, e);
  }
  return map;
}

export function cellKey(partnerId: string, endpointKey: number): string {
  return `${partnerId}:${endpointKey}`;
}
