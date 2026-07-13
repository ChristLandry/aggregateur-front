"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { apiGet, apiPost, ApiError } from "./client";
import { usePartnerStore } from "@/lib/partner/store";
import { mapTransaction, type ApiTransactionDto } from "./mappers";
import type { Transaction } from "./types";

export interface BankBalance {
  identifier: string;
  balance: number;
  currency: string;
  status: string;
}

export interface BankKyc {
  accountNumber: string;
  fullName: string;
  dateOfBirth?: string | null;
  nationalId?: string | null;
  phoneNumber?: string | null;
}

export interface BankKycInput {
  accountNumber: string;
  partnerTemporalyCode?: string | null;
  extras?: Record<string, unknown> | null;
}

export interface TransactionOpInput {
  partnerTransactionRef: string;
  amount: number;
  currency: string;
  bankAccount?: string | null;
  phoneNumber?: string | null;
  subscriptionId?: string | null;
  fees?: number | null;
  description?: string | null;
  extraData?: unknown;
}

type ApiBalanceDto = {
  identifier?: string;
  Identifier?: string;
  balance?: number;
  Balance?: number;
  currency?: string;
  Currency?: string;
  status?: string;
  Status?: string;
};

type ApiBankKycDto = {
  accountNumber?: string;
  AccountNumber?: string;
  fullName?: string;
  FullName?: string;
  dateOfBirth?: string | null;
  DateOfBirth?: string | null;
  nationalId?: string | null;
  NationalId?: string | null;
  phoneNumber?: string | null;
  PhoneNumber?: string | null;
};

/** Clé métier uniquement (pas de fallback WEB — interdit sur /bank et /wallet). */
export function resolveBankWalletApiKey(partnerId: string): string | undefined {
  return usePartnerStore.getState().getApiKey(partnerId);
}

function partnerHeaders(partnerId: string): Record<string, string> {
  const apiKey = resolveBankWalletApiKey(partnerId);
  if (!apiKey) {
    throw new ApiError(
      "Clé API absente pour ce partenaire. Effectuez une rotation depuis Partenaires.",
      "PARTNER_APIKEY_MISSING",
    );
  }
  return { "X-Partner-ApiKey": apiKey };
}

function mapBalance(dto: ApiBalanceDto): BankBalance {
  return {
    identifier: String(dto.identifier ?? dto.Identifier ?? ""),
    balance: Number(dto.balance ?? dto.Balance ?? 0),
    currency: String(dto.currency ?? dto.Currency ?? ""),
    status: String(dto.status ?? dto.Status ?? ""),
  };
}

function mapBankKyc(dto: ApiBankKycDto): BankKyc {
  return {
    accountNumber: String(dto.accountNumber ?? dto.AccountNumber ?? ""),
    fullName: String(dto.fullName ?? dto.FullName ?? ""),
    dateOfBirth: dto.dateOfBirth ?? dto.DateOfBirth,
    nationalId: dto.nationalId ?? dto.NationalId,
    phoneNumber: dto.phoneNumber ?? dto.PhoneNumber,
  };
}

/** GET /api/v1/bank/balance?subscriptionId= */
export function useBankBalance(
  partnerId: string | undefined,
  subscriptionId: string | undefined,
) {
  return useQuery({
    queryKey: ["bank", "balance", partnerId, subscriptionId],
    queryFn: async () => {
      const dto = await apiGet<ApiBalanceDto>(
        `/api/v1/bank/balance?subscriptionId=${subscriptionId}`,
        { headers: partnerHeaders(partnerId!) },
      );
      return mapBalance(dto);
    },
    enabled:
      !!partnerId && !!subscriptionId && !!resolveBankWalletApiKey(partnerId),
  });
}

/** POST /api/v1/bank/kyc */
export function useBankKyc(partnerId: string) {
  return useMutation({
    mutationFn: async (body: BankKycInput) => {
      const dto = await apiPost<ApiBankKycDto>("/api/v1/bank/kyc", body, {
        headers: partnerHeaders(partnerId),
      });
      return mapBankKyc(dto);
    },
  });
}

/** POST /api/v1/bank/debit */
export function useBankDebit(partnerId: string) {
  return useMutation({
    mutationFn: async (body: TransactionOpInput): Promise<Transaction> => {
      const dto = await apiPost<ApiTransactionDto>("/api/v1/bank/debit", body, {
        headers: partnerHeaders(partnerId),
      });
      return mapTransaction(dto);
    },
  });
}

/** POST /api/v1/bank/credit */
export function useBankCredit(partnerId: string) {
  return useMutation({
    mutationFn: async (body: TransactionOpInput): Promise<Transaction> => {
      const dto = await apiPost<ApiTransactionDto>("/api/v1/bank/credit", body, {
        headers: partnerHeaders(partnerId),
      });
      return mapTransaction(dto);
    },
  });
}
