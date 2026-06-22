"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface CurrentPartner {
  partnerId: string;
  partnerCode: string;
  partnerApiKey: string;
}

interface PartnerState {
  /** Partenaire actif pour les appels API (header X-Partner-ApiKey). */
  currentPartner: CurrentPartner | null;
  /** Clés API en clair mémorisées localement (création / rotation). */
  apiKeysByPartnerId: Record<string, string>;
  /** Codes partenaire pour affichage (partnerId → code). */
  partnerCodesByPartnerId: Record<string, string>;

  setCurrentPartner: (partner: CurrentPartner | null) => void;
  registerPartnerApiKey: (
    partnerId: string,
    partnerCode: string,
    partnerApiKey: string,
  ) => void;
  getApiKey: (partnerId: string) => string | undefined;
  clear: () => void;
}

export const usePartnerStore = create<PartnerState>()(
  persist(
    (set, get) => ({
      currentPartner: null,
      apiKeysByPartnerId: {},
      partnerCodesByPartnerId: {},

      setCurrentPartner: (partner) => set({ currentPartner: partner }),

      registerPartnerApiKey: (partnerId, partnerCode, partnerApiKey) => {
        set((s) => {
          const base = {
            apiKeysByPartnerId: { ...s.apiKeysByPartnerId, [partnerId]: partnerApiKey },
            partnerCodesByPartnerId: { ...s.partnerCodesByPartnerId, [partnerId]: partnerCode },
          };
          if (s.currentPartner?.partnerId === partnerId) {
            return {
              ...base,
              currentPartner: { partnerId, partnerCode, partnerApiKey },
            };
          }
          return base;
        });
      },

      getApiKey: (partnerId) => get().apiKeysByPartnerId[partnerId],

      clear: () =>
        set({
          currentPartner: null,
          apiKeysByPartnerId: {},
          partnerCodesByPartnerId: {},
        }),
    }),
    {
      name: "aggregator.partner",
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? undefined! : localStorage,
      ),
      partialize: (s) => ({
        currentPartner: s.currentPartner,
        apiKeysByPartnerId: s.apiKeysByPartnerId,
        partnerCodesByPartnerId: s.partnerCodesByPartnerId,
      }),
    },
  ),
);
