"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { apiGet, apiPost, apiClient, ApiError } from "./client";
import { resolveBankWalletApiKey } from "./bank";
import { mapTransaction, type ApiTransactionDto } from "./mappers";
import type { Transaction } from "./types";
import type { TransactionOpInput } from "./bank";

export interface WalletBalance {
  identifier: string;
  balance: number;
  currency: string;
  status: string;
}

export interface WalletKyc {
  phoneNumber: string;
  fullName: string;
  dateOfBirth?: string | null;
  nationalId?: string | null;
}

export interface WalletKycInput {
  phoneNumber: string;
  partnerTemporalyCode?: string | null;
  extras?: Record<string, unknown> | null;
}

export interface WalletLinkInput {
  phoneNumber: string;
  partnerRef: string;
  bankAccount: string;
  extras?: Record<string, unknown> | null;
}

export interface WalletUnlinkInput {
  linkId?: string | null;
  phoneNumber?: string | null;
  partnerRef?: string | null;
}

export interface WalletLinkResult {
  linkId?: string | null;
  expiresAt?: string | null;
  status: string;
  partnerTransactionRef?: string | null;
}

export interface WalletLinkResponse {
  linkId?: string | null;
  phoneNumber: string;
  status: string;
  failureReason?: string | null;
  expiresAt?: string | null;
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

type ApiWalletKycDto = {
  phoneNumber?: string;
  PhoneNumber?: string;
  fullName?: string;
  FullName?: string;
  dateOfBirth?: string | null;
  DateOfBirth?: string | null;
  nationalId?: string | null;
  NationalId?: string | null;
};

type ApiWalletLinkResponseDto = {
  linkId?: string | null;
  LinkId?: string | null;
  phoneNumber?: string;
  PhoneNumber?: string;
  status?: string;
  Status?: string;
  failureReason?: string | null;
  FailureReason?: string | null;
  expiresAt?: string | null;
  ExpiresAt?: string | null;
};

type FlatLinkEnvelope = {
  success?: boolean;
  Success?: boolean;
  partnerTransactionRef?: string | null;
  PartnerTransactionRef?: string | null;
  status?: string | null;
  Status?: string | null;
  data?: { linkId?: string; expiresAt?: string | null } | null;
  Data?: { linkId?: string; LinkId?: string; expiresAt?: string | null; ExpiresAt?: string | null } | null;
  errorCode?: string | null;
  ErrorCode?: string | null;
  errorMessage?: string | null;
  ErrorMessage?: string | null;
};

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

function mapBalance(dto: ApiBalanceDto): WalletBalance {
  return {
    identifier: String(dto.identifier ?? dto.Identifier ?? ""),
    balance: Number(dto.balance ?? dto.Balance ?? 0),
    currency: String(dto.currency ?? dto.Currency ?? ""),
    status: String(dto.status ?? dto.Status ?? ""),
  };
}

function mapWalletKyc(dto: ApiWalletKycDto): WalletKyc {
  return {
    phoneNumber: String(dto.phoneNumber ?? dto.PhoneNumber ?? ""),
    fullName: String(dto.fullName ?? dto.FullName ?? ""),
    dateOfBirth: dto.dateOfBirth ?? dto.DateOfBirth,
    nationalId: dto.nationalId ?? dto.NationalId,
  };
}

function mapLinkResponse(dto: ApiWalletLinkResponseDto): WalletLinkResponse {
  return {
    linkId: dto.linkId ?? dto.LinkId,
    phoneNumber: String(dto.phoneNumber ?? dto.PhoneNumber ?? ""),
    status: String(dto.status ?? dto.Status ?? ""),
    failureReason: dto.failureReason ?? dto.FailureReason,
    expiresAt: dto.expiresAt ?? dto.ExpiresAt,
  };
}

/** GET /api/v1/wallet/balance?subscriptionId= */
export function useWalletBalance(
  partnerId: string | undefined,
  subscriptionId: string | undefined,
) {
  return useQuery({
    queryKey: ["wallet", "balance", partnerId, subscriptionId],
    queryFn: async () => {
      const dto = await apiGet<ApiBalanceDto>(
        `/api/v1/wallet/balance?subscriptionId=${subscriptionId}`,
        { headers: partnerHeaders(partnerId!) },
      );
      return mapBalance(dto);
    },
    enabled: !!partnerId && !!subscriptionId && !!resolveBankWalletApiKey(partnerId),
  });
}

/** POST /api/v1/wallet/kyc */
export function useWalletKyc(partnerId: string) {
  return useMutation({
    mutationFn: async (body: WalletKycInput) => {
      const dto = await apiPost<ApiWalletKycDto>("/api/v1/wallet/kyc", body, {
        headers: partnerHeaders(partnerId),
      });
      return mapWalletKyc(dto);
    },
  });
}

/** POST /api/v1/wallet/debit */
export function useWalletDebit(partnerId: string) {
  return useMutation({
    mutationFn: async (body: TransactionOpInput): Promise<Transaction> => {
      const dto = await apiPost<ApiTransactionDto>("/api/v1/wallet/debit", body, {
        headers: partnerHeaders(partnerId),
      });
      return mapTransaction(dto);
    },
  });
}

/** POST /api/v1/wallet/credit */
export function useWalletCredit(partnerId: string) {
  return useMutation({
    mutationFn: async (body: TransactionOpInput): Promise<Transaction> => {
      const dto = await apiPost<ApiTransactionDto>("/api/v1/wallet/credit", body, {
        headers: partnerHeaders(partnerId),
      });
      return mapTransaction(dto);
    },
  });
}

/** POST /api/v1/wallet/cancel */
export function useWalletCancel(partnerId: string) {
  return useMutation({
    mutationFn: async (body: {
      partnerTransactionRef: string;
      originalExternalRef: string;
    }): Promise<Transaction> => {
      const dto = await apiPost<ApiTransactionDto>("/api/v1/wallet/cancel", body, {
        headers: partnerHeaders(partnerId),
      });
      return mapTransaction(dto);
    },
  });
}

/**
 * POST /api/v1/wallet/link
 * Réponse à plat (WalletOperationEnvelope), pas d'ApiResponse autour.
 */
export function useWalletLink(partnerId: string) {
  return useMutation({
    mutationFn: async (body: WalletLinkInput): Promise<WalletLinkResult> => {
      const headers = partnerHeaders(partnerId);
      const resp = await apiClient.post<FlatLinkEnvelope>("/api/v1/wallet/link", body, {
        headers,
      });
      const raw = resp.data;
      const success = raw.success ?? raw.Success;
      const errorCode = (raw.errorCode ?? raw.ErrorCode) ?? undefined;
      const errorMessage = (raw.errorMessage ?? raw.ErrorMessage) ?? undefined;
      if (success === false) {
        throw new ApiError(
          errorMessage ?? "Échec de la liaison wallet",
          errorCode ?? "WALLET_LINK_FAILED",
        );
      }
      const data = raw.data ?? raw.Data;
      return {
        linkId: data?.linkId ?? (data as { LinkId?: string } | null | undefined)?.LinkId,
        expiresAt:
          data?.expiresAt ??
          (data as { ExpiresAt?: string | null } | null | undefined)?.ExpiresAt,
        status: String(raw.status ?? raw.Status ?? "SUCCESS"),
        partnerTransactionRef:
          raw.partnerTransactionRef ?? raw.PartnerTransactionRef,
      };
    },
  });
}

/** POST /api/v1/wallet/unlink — ApiResponse&lt;WalletLinkResponse&gt; */
export function useWalletUnlink(partnerId: string) {
  return useMutation({
    mutationFn: async (body: WalletUnlinkInput): Promise<WalletLinkResponse> => {
      const dto = await apiPost<ApiWalletLinkResponseDto>(
        "/api/v1/wallet/unlink",
        body,
        { headers: partnerHeaders(partnerId) },
      );
      return mapLinkResponse(dto);
    },
  });
}
