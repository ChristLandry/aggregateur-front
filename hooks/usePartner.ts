"use client";

import { usePartnerStore } from "@/lib/partner/store";
import { usePartners } from "@/lib/api/partners";

export function usePartner() {
  const currentPartner = usePartnerStore((s) => s.currentPartner);
  const setCurrentPartner = usePartnerStore((s) => s.setCurrentPartner);
  const getApiKey = usePartnerStore((s) => s.getApiKey);
  const registerPartnerApiKey = usePartnerStore((s) => s.registerPartnerApiKey);
  const { data: partners } = usePartners();

  const current =
    partners?.find((p) => p.id === currentPartner?.partnerId) ?? null;

  function selectPartner(partnerId: string) {
    const p = partners?.find((x) => x.id === partnerId);
    if (!p?.id || !p.code) return;
    const apiKey = getApiKey(partnerId);
    if (!apiKey) return;
    setCurrentPartner({
      partnerId: p.id,
      partnerCode: p.code,
      partnerApiKey: apiKey,
    });
  }

  function clearPartner() {
    setCurrentPartner(null);
  }

  return {
    currentPartner,
    partnerId: currentPartner?.partnerId ?? null,
    partnerApiKey: currentPartner?.partnerApiKey ?? null,
    setCurrentPartner,
    selectPartner,
    clearPartner,
    registerPartnerApiKey,
    getApiKey,
    current,
    partners,
  };
}
