"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Activity, CheckCircle2, XCircle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { getApiBaseUrl } from "@/lib/api/config";

const BASE_URL = getApiBaseUrl();

export default function SystemPage() {
  const health = useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const r = await axios.get(`${BASE_URL}/health`, { validateStatus: () => true });
      return { status: r.status, body: r.data };
    },
    refetchInterval: 15_000,
  });

  const metrics = useQuery({
    queryKey: ["metrics"],
    queryFn: async () => {
      const r = await axios.get<string>(`${BASE_URL}/metrics`, {
        responseType: "text",
        validateStatus: () => true,
      });
      return r.data ?? "";
    },
    refetchInterval: 30_000,
  });

  const healthy = health.data?.status === 200;

  return (
    <div>
      <PageHeader title="Système" description="Santé et métriques de l'API." />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4" /> Santé
            </CardTitle>
          </CardHeader>
          <CardContent>
            {health.isLoading ? (
              <Skeleton className="h-12 w-full" />
            ) : healthy ? (
              <div className="flex items-center gap-2 text-success">
                <CheckCircle2 /> OK
              </div>
            ) : (
              <div className="flex items-center gap-2 text-destructive">
                <XCircle /> Indisponible
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Métriques Prometheus</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <pre className="max-h-72 overflow-auto rounded-md bg-surface-muted p-3 text-[11px] leading-4 font-mono">
                {String(metrics.data ?? "").slice(0, 4000) || "(vide)"}
              </pre>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
