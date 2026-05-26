"use client";

import { useDashboardSummary } from "@/lib/api/dashboard";
import { KpiCard } from "@/components/KpiCard";
import { PageHeader } from "@/components/PageHeader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Receipt,
  Wallet,
} from "lucide-react";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";

export default function DashboardPage() {
  const { data, isLoading } = useDashboardSummary();

  return (
    <div>
      <PageHeader
        title="Tableau de bord"
        description="Vue d'ensemble de la plateforme — actualisé toutes les 30 secondes."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))
        ) : (
          <>
            <KpiCard
              label="Transactions du jour"
              value={formatNumber(data?.transactionsToday ?? 0)}
              delta={data?.transactionsTodayDelta}
              icon={Receipt}
              sparkline={data?.sparkline}
            />
            <KpiCard
              label="Taux de succès"
              value={`${((data?.successRate ?? 0) * 100).toFixed(1)}%`}
              delta={data?.successRateDelta}
              icon={CheckCircle2}
            />
            <KpiCard
              label="Volume total"
              value={formatCurrency(data?.totalVolume ?? 0, data?.currency ?? "XOF")}
              icon={Wallet}
            />
            <KpiCard
              label="Partenaires actifs"
              value={formatNumber(data?.activePartners ?? 0)}
              icon={Activity}
            />
          </>
        )}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top partenaires</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6">
                <Skeleton className="h-40 w-full" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Partenaire</TableHead>
                    <TableHead className="text-right">Transactions</TableHead>
                    <TableHead className="text-right">Volume</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.topPartners ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                        Aucune donnée
                      </TableCell>
                    </TableRow>
                  ) : (
                    (data?.topPartners ?? []).map((p) => (
                      <TableRow key={p.partnerId}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatNumber(p.transactions)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(p.volume, data?.currency ?? "XOF")}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Échecs récents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (data?.recentFailures ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun échec récent.</p>
            ) : (
              (data?.recentFailures ?? []).map((f) => (
                <div
                  key={f.id}
                  className="rounded-md border border-border bg-surface-muted/50 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium">{f.partnerName ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{f.reason}</div>
                    </div>
                    <div className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {formatDate(f.createdAt)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
