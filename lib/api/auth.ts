"use client";

import { useMutation } from "@tanstack/react-query";
import { apiPost, apiClient } from "./client";
import { notifyError, notifySuccess } from "./notify";
import type { LoginRequest, LoginResponse, ApiResponse } from "./types";
import { mapLogin, type ApiLoginDto } from "./mappers";
import { useAuthStore } from "@/lib/auth/store";

export function useLogin() {
  return useMutation({
    mutationFn: async (body: LoginRequest) => {
      const dto = await apiPost<ApiLoginDto>("/api/v1/auth/login", body);
      return mapLogin(dto);
    },
    onSuccess: (data) => {
      useAuthStore.getState().setSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
        role: data.role,
      });
      if (data.partnerId) {
        useAuthStore.getState().setPartnerId(data.partnerId);
      }
      notifySuccess("Connexion réussie");
    },
    onError: (error) => {
      notifyError(error, "Identifiants invalides");
    },
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        try {
          // Bypass interceptor: a logout call should not trigger refresh loops.
          await apiClient.post<ApiResponse<unknown>>(
            "/api/v1/auth/logout",
            { refreshToken },
            { headers: { "Content-Type": "application/json" } },
          );
        } catch {
          // Even if the call fails we still clear the local session below.
        }
      }
    },
    onSuccess: () => {
      notifySuccess("Déconnexion réussie");
    },
    onSettled: () => {
      useAuthStore.getState().clear();
      if (typeof window !== "undefined") window.location.href = "/login";
    },
  });
}
