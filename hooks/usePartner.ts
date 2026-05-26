"use client";

import { useAuthStore } from "@/lib/auth/store";
import { usePartners } from "@/lib/api/partners";

export function usePartner() {
  const partnerId = useAuthStore((s) => s.partnerId);
  const setPartnerId = useAuthStore((s) => s.setPartnerId);
  const { data: partners } = usePartners();
  const current = partners?.find((p) => p.id === partnerId) ?? null;
  return { partnerId, setPartnerId, current, partners };
}
