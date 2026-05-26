"use client";

import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";
import { useAuthStore } from "@/lib/auth/store";
import type { ApiResponse, LoginResponse } from "./types";
import { getApiBaseUrl } from "./config";
import { mapLogin, type ApiLoginDto } from "./mappers";

const BASE_URL = getApiBaseUrl();

// === Endpoints that must NOT carry the X-Partner-Id header ===
const PARTNER_AGNOSTIC_PATHS = [
  /^\/api\/v1\/auth\//,
  /^\/api\/v1\/partners(?:\/|$|\?)/,
  /^\/api\/v1\/dashboard\//,
  /^\/api\/v1\/reports\//,
  /^\/api\/v1\/accounting\//,
  /^\/api\/v1\/partner-endpoints(?:\/|$|\?)/,
  /^\/health$/,
  /^\/metrics$/,
];

function shouldSendPartnerHeader(url?: string): boolean {
  if (!url) return false;
  return !PARTNER_AGNOSTIC_PATHS.some((rx) => rx.test(url));
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  // We want raw 4xx errors to surface so React Query can flag them.
  validateStatus: (s) => s >= 200 && s < 300,
});

// === Request interceptor : attaches Authorization + (optionally) X-Partner-Id ===
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { accessToken, partnerId } = useAuthStore.getState();
  if (accessToken) {
    config.headers.set("Authorization", `Bearer ${accessToken}`);
  }
  if (partnerId && shouldSendPartnerHeader(config.url ?? undefined)) {
    config.headers.set("X-Partner-Id", partnerId);
  }
  return config;
});

// === Refresh-flow state ===
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

// === Response interceptor : handles 401 + transparent refresh ===
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

    return Promise.reject(error);
  },
);

// === Helpers : unwrap envelope ===
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

function unwrap<T>(env: ApiResponse<T>): T {
  if (env && env.success === false) {
    throw new ApiError(env.errorMessage ?? "Erreur API", env.errorCode);
  }
  return env.data as T;
}

export class ApiError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
    this.name = "ApiError";
  }
}

/** Extracts a user-friendly message from any axios/api error. */
export function getErrorMessage(error: unknown, fallback = "Une erreur est survenue"): string {
  if (error instanceof ApiError) return error.message;
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiResponse<unknown> | undefined;
    return (
      data?.errorMessage ??
      data?.errorCode ??
      error.message ??
      fallback
    );
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

/** Toast-friendly message with errorCode + errorMessage when available. */
export function formatApiErrorForToast(
  error: unknown,
  fallback = "Une erreur est survenue",
): string {
  if (error instanceof ApiError) {
    if (error.code && error.message) return `${error.code} — ${error.message}`;
    return error.message || fallback;
  }
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiResponse<unknown> | undefined;
    const code = data?.errorCode;
    const msg = data?.errorMessage ?? error.message;
    if (code && msg) return `${code} — ${msg}`;
    return code ?? msg ?? fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
