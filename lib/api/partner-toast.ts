"use client";

import { toast } from "sonner";
import { useAuthStore } from "@/lib/auth/store";
import { hasRole, ROLE_FINANCE_SET, tokenRole } from "@/lib/auth/jwt";
import { PARTNER_ERROR_MESSAGES } from "./api-errors";
import { requestOpenPartnerSelector } from "@/lib/partner/selector-events";

function canOpenPartnerSelector(): boolean {
  const token = useAuthStore.getState().accessToken;
  return hasRole(tokenRole(token), ROLE_FINANCE_SET);
}

export function toastWebPartnerForbidden(): void {
  const message = PARTNER_ERROR_MESSAGES.WEB_PARTNER_FORBIDDEN;
  if (canOpenPartnerSelector()) {
    toast.error(message, {
      duration: 10_000,
      action: {
        label: "Sélectionner un partenaire",
        onClick: () => requestOpenPartnerSelector(),
      },
    });
  } else {
    toast.error(message);
  }
}
