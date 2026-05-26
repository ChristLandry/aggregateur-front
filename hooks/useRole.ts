"use client";

import { useAuthStore } from "@/lib/auth/store";
import { UserRole } from "@/lib/enums";
import { ROLE_ADMIN_SET, ROLE_FINANCE_SET, hasRole } from "@/lib/auth/jwt";

export function useRole() {
  const role = useAuthStore((s) => s.user?.role ?? null);
  return {
    role,
    isAuthenticated: !!useAuthStore.getState().accessToken,
    isAdmin: hasRole(role, ROLE_ADMIN_SET),
    isFinance: hasRole(role, ROLE_FINANCE_SET),
    isPartner: role === UserRole.Partner,
    isReadOnly: role === UserRole.ReadOnly,
    canManageAccounting: hasRole(role, ROLE_FINANCE_SET),
  };
}
