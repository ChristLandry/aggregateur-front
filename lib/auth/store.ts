"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { UserRole } from "@/lib/enums";
import { decodeToken, tokenRole } from "./jwt";

export interface AuthUser {
  id?: string;
  username?: string;
  email?: string;
  role: UserRole | null;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: string | null;
  user: AuthUser | null;

  setSession: (s: {
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
    role?: number;
  }) => void;
  setTokens: (accessToken: string, refreshToken: string, expiresAt: string) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      user: null,

      setSession: ({ accessToken, refreshToken, expiresAt, role }) => {
        const payload = decodeToken(accessToken);
        const inferredRole =
          (typeof role === "number" ? (role as UserRole) : tokenRole(accessToken)) ?? null;
        set({
          accessToken,
          refreshToken,
          expiresAt,
          user: {
            id: payload?.sub,
            username:
              (payload?.username as string | undefined) ??
              (payload?.unique_name as string | undefined),
            email: payload?.email as string | undefined,
            role: inferredRole,
          },
        });
      },
      setTokens: (accessToken, refreshToken, expiresAt) => {
        const payload = decodeToken(accessToken);
        set((s) => ({
          accessToken,
          refreshToken,
          expiresAt,
          user: s.user ?? {
            id: payload?.sub,
            username:
              (payload?.username as string | undefined) ??
              (payload?.unique_name as string | undefined),
            email: payload?.email as string | undefined,
            role: tokenRole(accessToken),
          },
        }));
      },
      clear: () =>
        set({
          accessToken: null,
          refreshToken: null,
          expiresAt: null,
          user: null,
        }),
    }),
    {
      name: "aggregator.auth",
      storage: createJSONStorage(() => (typeof window === "undefined" ? undefined! : localStorage)),
      partialize: (s) => ({
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
        expiresAt: s.expiresAt,
        user: s.user,
      }),
    },
  ),
);
