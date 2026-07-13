"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut, apiDelete, ApiError } from "./client";
import { notifyError, notifySuccess } from "./notify";
import type {
  AccountingLine,
  AccountingSchema,
  Movement,
  MovementQuery,
  PagedResult,
  Transaction,
  TransactionQuery,
} from "./types";
import {
  mapAccountingLine,
  mapAccountingSchema,
  mapMovement,
  mapPaginatedMovements,
  mapPaginatedTransactions,
  mapTransaction,
  toCreateAccountingSchemaBody,
  toSchemaLineBody,
  type ApiAccountingLineDto,
  type ApiAccountingSchemaDto,
  type ApiMovementDto,
  type ApiPaginatedResult,
  type ApiTransactionDto,
} from "./mappers";
import type {
  AccountingLineFormValues,
  AccountingSchemaFormValues,
} from "@/lib/schemas/accounting";

export const accountingKeys = {
  all: ["accounting"] as const,
  schemas: () => [...accountingKeys.all, "schemas"] as const,
  schema: (id: string) => [...accountingKeys.all, "schemas", id] as const,
  movements: (q: MovementQuery) => [...accountingKeys.all, "movements", q] as const,
  txMovements: (transactionId: string) =>
    [...accountingKeys.all, "tx", transactionId] as const,
  transactions: (q: TransactionQuery) =>
    [...accountingKeys.all, "transactions", q] as const,
  transaction: (id: string) => [...accountingKeys.all, "transaction", id] as const,
};

export function useAccountingSchemas() {
  return useQuery({
    queryKey: accountingKeys.schemas(),
    queryFn: async () => {
      const rows = await apiGet<ApiAccountingSchemaDto[]>("/api/v1/accounting/schemas");
      return rows.map(mapAccountingSchema);
    },
  });
}

export function useAccountingSchema(id: string | undefined) {
  return useQuery({
    queryKey: accountingKeys.schema(id ?? ""),
    queryFn: async () => {
      const dto = await apiGet<ApiAccountingSchemaDto>(`/api/v1/accounting/schemas/${id}`);
      return mapAccountingSchema(dto);
    },
    enabled: !!id,
  });
}

export function useCreateSchema() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      body: Partial<AccountingSchema> | Partial<AccountingSchemaFormValues>,
    ) => {
      const payload = toCreateAccountingSchemaBody(body);
      const schemaId = await apiPost<string>(
        "/api/v1/accounting/schemas",
        payload,
      );
      const dto = await apiGet<ApiAccountingSchemaDto>(
        `/api/v1/accounting/schemas/${schemaId}`,
      );
      return mapAccountingSchema(dto);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: accountingKeys.schemas() });
      notifySuccess("Schéma créé");
    },
    onError: (e) => notifyError(e, "Création du schéma impossible"),
  });
}

export function useUpdateSchema(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<AccountingSchema>) => {
      await apiPut<void>(`/api/v1/accounting/schemas/${id}`, {
        name: patch.name,
        isActive: patch.isActive,
        priority: patch.priority,
        description: patch.description,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: accountingKeys.schema(id) });
      qc.invalidateQueries({ queryKey: accountingKeys.schemas() });
      notifySuccess("Schéma mis à jour");
    },
    onError: (e) => notifyError(e, "Mise à jour du schéma impossible"),
  });
}

export function useAddSchemaLine(schemaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      line: Partial<AccountingLine> | Partial<AccountingLineFormValues>,
    ) => {
      const lineId = await apiPost<string>(
        `/api/v1/accounting/schemas/${schemaId}/lines`,
        toSchemaLineBody(line),
      );
      return mapAccountingLine(
        { ...toSchemaLineBody(line), lineId } as ApiAccountingLineDto,
        schemaId,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: accountingKeys.schema(schemaId) });
      notifySuccess("Ligne ajoutée");
    },
    onError: (e) => {
      // UX détaillée dans SchemaLineForm (focus + suggestion d'ordre)
      if (e instanceof ApiError && e.code === "LINE_ORDER_DUPLICATE") return;
      notifyError(e, "Ajout de ligne impossible");
    },
  });
}

export function useUpdateSchemaLine(schemaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      lineId,
      values,
    }: {
      lineId: string;
      values: Partial<AccountingLine> | Partial<AccountingLineFormValues>;
    }) => {
      if (!lineId) {
        throw new Error("Identifiant de ligne manquant.");
      }
      await apiPut<void>(
        `/api/v1/accounting/schemas/${schemaId}/lines/${lineId}`,
        toSchemaLineBody(values),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: accountingKeys.schema(schemaId) });
      notifySuccess("Ligne mise à jour");
    },
    onError: (e) => {
      if (e instanceof ApiError && e.code === "LINE_ORDER_DUPLICATE") return;
      notifyError(e, "Modification de ligne impossible");
    },
  });
}

export function useDeleteSchemaLine(schemaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (lineId: string) => {
      if (!lineId) {
        throw new Error("Identifiant de ligne manquant.");
      }
      return apiDelete<void>(
        `/api/v1/accounting/schemas/${schemaId}/lines/${lineId}`,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: accountingKeys.schema(schemaId) });
      notifySuccess("Ligne supprimée");
    },
    onError: (e) => notifyError(e, "Suppression de ligne impossible"),
  });
}

function buildMovementsUrl(q: MovementQuery): string {
  const sp = new URLSearchParams();
  if (q.fromDate) sp.set("fromDate", q.fromDate);
  if (q.toDate) sp.set("toDate", q.toDate);
  if (q.account) sp.set("account", q.account);
  if (q.transactionId) sp.set("transactionId", q.transactionId);
  if (q.page) sp.set("page", String(q.page));
  if (q.pageSize) sp.set("pageSize", String(q.pageSize));
  const qs = sp.toString();
  return qs ? `/api/v1/accounting/movements?${qs}` : "/api/v1/accounting/movements";
}

export function useMovements(query: MovementQuery) {
  return useQuery({
    queryKey: accountingKeys.movements(query),
    queryFn: async () => {
      const dto = await apiGet<ApiPaginatedResult<ApiMovementDto>>(buildMovementsUrl(query));
      return mapPaginatedMovements(dto);
    },
  });
}

function buildTransactionsUrl(q: TransactionQuery): string {
  const sp = new URLSearchParams();
  if (q.partnerId) sp.set("partnerId", q.partnerId);
  if (q.account) sp.set("account", q.account);
  if (q.phoneNumber) sp.set("phoneNumber", q.phoneNumber);
  if (q.number) sp.set("number", q.number);
  if (q.fromDate) sp.set("fromDate", q.fromDate);
  if (q.toDate) sp.set("toDate", q.toDate);
  if (q.page) sp.set("page", String(q.page));
  if (q.pageSize) sp.set("pageSize", String(q.pageSize));
  const qs = sp.toString();
  return qs ? `/api/v1/accounting/transactions?${qs}` : "/api/v1/accounting/transactions";
}

export function useTransactions(query: TransactionQuery) {
  return useQuery({
    queryKey: accountingKeys.transactions(query),
    queryFn: async () => {
      const dto = await apiGet<ApiPaginatedResult<ApiTransactionDto>>(
        buildTransactionsUrl(query),
      );
      return mapPaginatedTransactions(dto);
    },
    meta: { errorFallback: "Impossible de charger les transactions" },
  });
}

export function useTransaction(id: string | undefined) {
  return useQuery({
    queryKey: accountingKeys.transaction(id ?? ""),
    queryFn: async () => {
      const dto = await apiGet<ApiTransactionDto>(`/api/v1/accounting/transactions/${id}`);
      return mapTransaction(dto);
    },
    enabled: !!id,
    meta: { errorFallback: "Impossible de charger la transaction" },
  });
}

export function useTransactionMovements(transactionId: string | undefined) {
  return useQuery({
    queryKey: accountingKeys.txMovements(transactionId ?? ""),
    queryFn: async () => {
      const rows = await apiGet<ApiMovementDto[]>(
        `/api/v1/accounting/transactions/${transactionId}/movements`,
      );
      return rows.map(mapMovement);
    },
    enabled: !!transactionId,
  });
}
