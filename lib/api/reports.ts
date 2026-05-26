"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { apiGet, apiClient, getErrorMessage } from "./client";
import type { ExportRequest } from "./types";
import { downloadBlob } from "@/lib/utils";
import { notifyError, notifySuccess } from "./notify";

export const reportsKeys = {
  all: ["reports"] as const,
  transactions: (q: TransactionsQuery) => [...reportsKeys.all, "transactions", q] as const,
  subscriptions: (q: SubscriptionsQuery) => [...reportsKeys.all, "subscriptions", q] as const,
  failureAnalysis: (q: DateRangeQuery) => [...reportsKeys.all, "failures", q] as const,
  accounting: (q: DateRangeQuery) => [...reportsKeys.all, "accounting", q] as const,
  statement: (q: StatementQuery) => [...reportsKeys.all, "statement", q] as const,
};

export interface DateRangeQuery {
  fromDate?: string;
  toDate?: string;
}
export interface TransactionsQuery extends DateRangeQuery {
  partnerId?: string;
  status?: number;
}
export interface SubscriptionsQuery {
  partnerId?: string;
  status?: number;
}
export interface StatementQuery extends DateRangeQuery {
  partnerId?: string;
}

function buildQS(obj: object): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export function useTransactionsReport(q: TransactionsQuery, enabled = true) {
  return useQuery({
    queryKey: reportsKeys.transactions(q),
    queryFn: () => apiGet<unknown[]>(`/api/v1/reports/transactions${buildQS(q)}`),
    enabled,
  });
}

export function useSubscriptionsReport(q: SubscriptionsQuery, enabled = true) {
  return useQuery({
    queryKey: reportsKeys.subscriptions(q),
    queryFn: () => apiGet<unknown[]>(`/api/v1/reports/subscriptions${buildQS(q)}`),
    enabled,
  });
}

export function useFailureAnalysisReport(q: DateRangeQuery, enabled = true) {
  return useQuery({
    queryKey: reportsKeys.failureAnalysis(q),
    queryFn: () => apiGet<unknown[]>(`/api/v1/reports/failure-analysis${buildQS(q)}`),
    enabled,
  });
}

export function useAccountingReport(q: DateRangeQuery, enabled = true) {
  return useQuery({
    queryKey: reportsKeys.accounting(q),
    queryFn: () => apiGet<unknown[]>(`/api/v1/reports/accounting${buildQS(q)}`),
    enabled,
  });
}

export function useStatementReport(q: StatementQuery, enabled = true) {
  return useQuery({
    queryKey: reportsKeys.statement(q),
    queryFn: () => apiGet<unknown[]>(`/api/v1/reports/partner-account-statement${buildQS(q)}`),
    enabled: enabled && !!q.partnerId,
  });
}

export function useExportReport() {
  return useMutation({
    mutationFn: async (body: ExportRequest) => {
      const resp = await apiClient.post<Blob>("/api/v1/reports/export", body, {
        responseType: "blob",
        headers: { Accept: "application/octet-stream" },
      });
      const ext = body.format === "xlsx" ? "xlsx" : "csv";
      const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      downloadBlob(resp.data as Blob, `${body.reportType}-${ts}.${ext}`);
      return true;
    },
    onSuccess: () => notifySuccess("Export téléchargé"),
    onError: (e) => notifyError(e, "Échec de l'export"),
  });
}
