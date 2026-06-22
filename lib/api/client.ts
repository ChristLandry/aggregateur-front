"use client";

import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/auth/store";
import { usePartnerStore } from "@/lib/partner/store";
import { resolvePartnerApiKey } from "@/lib/partner/api-key";
import { toastWebPartnerForbidden } from "./partner-toast";
import type { ApiResponse, LoginResponse } from "./types";
import { getApiBaseUrl } from "./config";
import { mapLogin, type ApiLoginDto } from "./mappers";
import {
  isKnownPartnerApiError,
  PARTNER_ERROR_MESSAGES,
  resolveApiErrorMessage,
  shouldToastPartnerApiError,
} from "./api-errors";

const BASE_URL = getApiBaseUrl();

/**
 * Routes sans header X-Partner-ApiKey :
 * - auth (login, refresh, logout)
 * - partners admin (dont allowed-codes)
 * - dashboard, reports, accounting admin
 * - financial/transactions* (JWT admin uniquement)
 */
const PARTNER_AGNOSTIC_PATHS = [
  /^\/api\/v1\/auth\//,
  /^\/api\/v1\/partners(?:\/|$|\?)/,
  /^\/api\/v1\/dashboard\//,
  /^\/api\/v1\/reports\//,
  /^\/api\/v1\/accounting\//,
  /^\/api\/v1\/partner-endpoints(?:\/|$|\?)/,
  /^\/api\/v1\/financial\/transactions(?:\/|$|\?)/,
  /^\/health$/,
  /^\/metrics$/,
];

function shouldSendPartnerApiKeyHeader(url?: string): boolean {
  if (!url) return false;
  return !PARTNER_AGNOSTIC_PATHS.some((rx) => rx.test(url));
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  validateStatus: (s) => s >= 200 && s < 300,
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.set("Authorization", `Bearer ${accessToken}`);
  }
  const apiKey = resolvePartnerApiKey();
  const hasExplicitPartnerKey = config.headers.has("X-Partner-ApiKey");
  if (
    !hasExplicitPartnerKey &&
    apiKey &&
    shouldSendPartnerApiKeyHeader(config.url ?? undefined)
  ) {
    config.headers.set("X-Partner-ApiKey", apiKey);
  }
  return config;
});

let isRefreshing = false;
let pendingRequests: Array<(token: string | null) => void> = [];

function subscribeToRefresh(cb: (token: string | null) => void) {
  pendingRequests.push(cb);
}

function broadcastRefresh(token: string | null) {
  pendingRequests.forEach((cb) => cb(token));
  pendingRequests = [];
}

async function performRefresh(refreshToken: string): Promise<LoginResponse | null> {
  try {
    const resp = await axios.post<ApiResponse<ApiLoginDto>>(
      `${BASE_URL}/api/v1/auth/refresh`,
      { refreshToken },
      { headers: { "Content-Type": "application/json" } },
    );
    if (resp.data?.success && resp.data?.data) return mapLogin(resp.data.data);
    return null;
  } catch {
    return null;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse<unknown>>) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;
    const status = error.response?.status;

    if (status === 401 && original && !original._retry) {
      const { refreshToken } = useAuthStore.getState();
      if (!refreshToken) {
        useAuthStore.getState().clear();
        usePartnerStore.getState().clear();
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }

      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeToRefresh((token) => {
            if (!token) return reject(error);
            original.headers.set("Authorization", `Bearer ${token}`);
            resolve(apiClient.request(original));
          });
        });
      }

      isRefreshing = true;
      const refreshed = await performRefresh(refreshToken);
      isRefreshing = false;

      if (!refreshed) {
        broadcastRefresh(null);
        useAuthStore.getState().clear();
        usePartnerStore.getState().clear();
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }

      useAuthStore.getState().setTokens(
        refreshed.accessToken,
        refreshed.refreshToken,
        refreshed.expiresAt,
      );
      broadcastRefresh(refreshed.accessToken);
      original.headers.set("Authorization", `Bearer ${refreshed.accessToken}`);
      return apiClient.request(original);
    }

    const raw = error.response?.data as ApiResponse<unknown> & Record<string, unknown>;
    const { success, errorCode, errorMessage } = readEnvelope(raw ?? {});
    if (success === false && errorCode) {
      const apiErr = new ApiError(errorMessage ?? "Erreur API", errorCode);
      if (apiErr.code === "WEB_PARTNER_FORBIDDEN") {
        toastWebPartnerForbidden();
      } else if (isKnownPartnerApiError(apiErr) && shouldToastPartnerApiError(apiErr.code)) {
        toast.error(resolveApiErrorMessage(apiErr));
      }
      return Promise.reject(apiErr);
    }

    return Promise.reject(error);
  },
);

export async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const r = await apiClient.get<ApiResponse<T>>(url, config);
  return unwrap(r.data);
}
export async function apiPost<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const r = await apiClient.post<ApiResponse<T>>(url, body, config);
  return unwrap(r.data);
}
export async function apiPut<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const r = await apiClient.put<ApiResponse<T>>(url, body, config);
  return unwrap(r.data);
}
export async function apiPatch<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const r = await apiClient.patch<ApiResponse<T>>(url, body, config);
  return unwrap(r.data);
}
export async function apiDelete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const r = await apiClient.delete<ApiResponse<T>>(url, config);
  return unwrap(r.data);
}

function readEnvelope<T>(env: ApiResponse<T> & Record<string, unknown>): {
  success?: boolean;
  data?: T;
  errorCode?: string;
  errorMessage?: string;
} {
  return {
    success: (env.success ?? env.Success) as boolean | undefined,
    data: (env.data ?? env.Data) as T | undefined,
    errorCode: (env.errorCode ?? env.ErrorCode) as string | undefined,
    errorMessage: (env.errorMessage ?? env.ErrorMessage) as string | undefined,
  };
}

function unwrap<T>(env: ApiResponse<T>): T {
  const raw = env as ApiResponse<T> & Record<string, unknown>;
  const { success, data, errorCode, errorMessage } = readEnvelope(raw);
  if (success === false) {
    throw new ApiError(errorMessage ?? "Erreur API", errorCode);
  }
  return data as T;
}

export class ApiError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
    this.name = "ApiError";
  }
}

export function getErrorMessage(error: unknown, fallback = "Une erreur est survenue"): string {
  return resolveApiErrorMessage(error, fallback);
}

export function formatApiErrorForToast(
  error: unknown,
  fallback = "Une erreur est survenue",
): string {
  if (error instanceof ApiError) {
    if (error.code && shouldToastPartnerApiError(error.code)) {
      return resolveApiErrorMessage(error);
    }
    if (error.code && error.message) return `${error.code} — ${error.message}`;
    return error.message || fallback;
  }
  if (axios.isAxiosError(error)) {
    const raw = error.response?.data as ApiResponse<unknown> & Record<string, unknown>;
    const { errorCode, errorMessage } = readEnvelope(raw ?? {});
    const code = errorCode;
    if (code && shouldToastPartnerApiError(code)) {
      return PARTNER_ERROR_MESSAGES[code];
    }
    const msg = errorMessage ?? error.message;
    if (code && msg) return `${code} — ${msg}`;
    return code ?? msg ?? fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
