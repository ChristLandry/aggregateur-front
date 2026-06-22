"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "./client";
import {
  mapMovement,
  mapPaginatedTransactions,
  mapTransaction,
  type ApiMovementDto,
  type ApiPaginatedResult,
  type ApiTransactionDto,
} from "./mappers";
import type { Movement, PagedResult, Transaction } from "./types";

export const transactionsKeys = {
  all: ["transactions"] as const,
  search: (filters: TransactionSearchFilters) =>
    [...transactionsKeys.all, "search", filters] as const,
  detail: (id: string) => [...transactionsKeys.all, id] as const,
  movements: (id: string) => [...transactionsKeys.all, id, "movements"] as const,
};

export interface TransactionSearchFilters {
  fromDate?: string;
  toDate?: string;
  partnerId?: string;
  status?: number;
  bankAccount?: string;
  phoneNumber?: string;
  partnerTransactionRef?: string;
  type?: number;
  page?: number;
  pageSize?: number;
}

function buildSearchUrl(filters: TransactionSearchFilters): string {
  const sp = new URLSearchParams();
  if (filters.fromDate) sp.set("fromDate", filters.fromDate);
  if (filters.toDate) sp.set("toDate", filters.toDate);
  if (filters.partnerId) sp.set("partnerId", filters.partnerId);
  if (filters.status !== undefined) sp.set("status", String(filters.status));
  if (filters.bankAccount) sp.set("bankAccount", filters.bankAccount);
  if (filters.phoneNumber) sp.set("phoneNumber", filters.phoneNumber);
  if (filters.partnerTransactionRef) {
    sp.set("partnerTransactionRef", filters.partnerTransactionRef);
  }
  if (filters.type !== undefined) sp.set("type", String(filters.type));
  if (filters.page) sp.set("page", String(filters.page));
  if (filters.pageSize) sp.set("pageSize", String(filters.pageSize));
  const qs = sp.toString();
  return qs
    ? `/api/v1/financial/transactions?${qs}`
    : "/api/v1/financial/transactions";
}

export function useSearchTransactions(filters: TransactionSearchFilters) {
  return useQuery({
    queryKey: transactionsKeys.search(filters),
    queryFn: async () => {
      const dto = await apiGet<ApiPaginatedResult<ApiTransactionDto>>(
        buildSearchUrl(filters),
      );
      return mapPaginatedTransactions(dto);
    },
    meta: { errorFallback: "Impossible de charger les transactions" },
  });
}

export function useTransactionById(id: string | undefined) {
  return useQuery({
    queryKey: transactionsKeys.detail(id ?? ""),
    queryFn: async () => {
      const dto = await apiGet<ApiTransactionDto>(`/api/v1/financial/transactions/${id}`);
      return mapTransaction(dto);
    },
    enabled: !!id,
    meta: { errorFallback: "Impossible de charger la transaction" },
  });
}

export function useTransactionMovements(id: string | undefined) {
  return useQuery({
    queryKey: transactionsKeys.movements(id ?? ""),
    queryFn: async () => {
      const rows = await apiGet<ApiMovementDto[]>(
        `/api/v1/financial/transactions/${id}/movements`,
      );
      return rows.map(mapMovement);
    },
    enabled: !!id,
    meta: { errorFallback: "Impossible de charger les mouvements" },
  });
}

export type { PagedResult, Transaction, Movement };
