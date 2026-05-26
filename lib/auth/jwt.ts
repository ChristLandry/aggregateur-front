import { jwtDecode } from "jwt-decode";
import { UserRole } from "@/lib/enums";

export interface JwtPayload {
  sub?: string;
  unique_name?: string;
  username?: string;
  email?: string;
  role?: string | number;
  partnerId?: string;
  exp?: number;
  iat?: number;
  [k: string]: unknown;
}

export function decodeToken(token: string | null | undefined): JwtPayload | null {
  if (!token) return null;
  try {
    return jwtDecode<JwtPayload>(token);
  } catch {
    return null;
  }
}

export function tokenRole(token: string | null | undefined): UserRole | null {
  const p = decodeToken(token);
  if (!p) return null;
  if (typeof p.role === "number") return p.role as UserRole;
  if (typeof p.role === "string") {
    const asNum = Number(p.role);
    if (!Number.isNaN(asNum)) return asNum as UserRole;
    const key = p.role as keyof typeof UserRole;
    if (key in UserRole) return UserRole[key] as UserRole;
  }
  return null;
}

export function tokenExpiresAt(token: string | null | undefined): number | null {
  const p = decodeToken(token);
  return p?.exp ? p.exp * 1000 : null;
}

export function isTokenExpired(token: string | null | undefined, skewMs = 30_000): boolean {
  const at = tokenExpiresAt(token);
  if (!at) return true;
  return Date.now() + skewMs >= at;
}

export const ROLE_ADMIN_SET = new Set<UserRole>([
  UserRole.SuperAdmin,
  UserRole.Admin,
]);

export const ROLE_FINANCE_SET = new Set<UserRole>([
  UserRole.SuperAdmin,
  UserRole.Admin,
  UserRole.Finance,
]);

export function hasRole(role: UserRole | null | undefined, allowed: Set<UserRole>): boolean {
  if (role === null || role === undefined) return false;
  return allowed.has(role);
}
