"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "./client";
import type { DashboardSummary, PartnerSummary } from "./types";
import {
  mapAdminDashboard,
  mapPartnerDashboard,
  type ApiAdminDashboardDto,
  type ApiPartnerDashboardDto,
} from "./mappers";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  summary: () => [...dashboardKeys.all, "summary"] as const,
  partnerSummary: (id: string) => [...dashboardKeys.all, "partner", id] as const,
};

export function useDashboardSummary() {
  return useQuery({
    queryKey: dashboardKeys.summary(),
    queryFn: async () => {
      const dto = await apiGet<ApiAdminDashboardDto>("/api/v1/dashboard/summary");
      return mapAdminDashboard(dto);
    },
    refetchInterval: 30_000,
  });
}

export function usePartnerDashboard(id: string | undefined) {
  return useQuery({
    queryKey: dashboardKeys.partnerSummary(id ?? ""),
    queryFn: async () => {
      const dto = await apiGet<ApiPartnerDashboardDto>(
        `/api/v1/dashboard/partners/${id}/summary`,
      );
      return mapPartnerDashboard(dto);
    },
    enabled: !!id,
    refetchInterval: 30_000,
  });
}
