"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, CheckCircle2, XCircle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, type DataTableColumn } from "@/components/tables/DataTable";
import { TransactionStatusBadge } from "@/components/StatusBadge";
import { RoleGuard } from "@/components/AuthGuard";
import { useTransactionById, useTransactionMovements } from "@/lib/api/transactions";
import { usePartners } from "@/lib/api/partners";
import { ROLE_FINANCE_SET, hasRole } from "@/lib/auth/jwt";
import {
  LedgerSide,
  TransactionStatus,
  TransactionTypeLabel,
} from "@/lib/enums";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Movement } from "@/lib/api/types";

function formatJsonBody(tx: { extraData?: string } | null): string {
  if (!tx) return "{}";
  if (tx.extraData) {
    try {
      return JSON.stringify(JSON.parse(tx.extraData), null, 2);
    } catch {
      return tx.extraData;
    }
  }
  return JSON.stringify(tx, null, 2);
}

export default function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: tx, isLoading: txLoading } = useTransactionById(id);
  const { data: movements, isLoading: movLoading } = useTransactionMovements(id);
  const { data: partners } = usePartners();

  const partnerLabel = partners?.find((p) => p.id === tx?.partnerId);

  if (txLoading || !tx) {
    return (
      <RoleGuard allow={(role) => hasRole(role, ROLE_FINANCE_SET)}>
        <Skeleton className="h-64 w-full" />
      </RoleGuard>
    );
  }

  const rows = movements ?? [];
  const totalDebit = rows
    .filter((m) => m.side === LedgerSide.Debit)
    .reduce((s, m) => s + Math.abs(m.amount), 0);
  const totalCredit = rows
    .filter((m) => m.side === LedgerSide.Credit)
    .reduce((s, m) => s + Math.abs(m.amount), 0);
  const diff = totalCredit - totalDebit;
  const balanced = Math.abs(diff) < 0.01;
  const currency = rows[0]?.currency ?? tx.currency;

  const movementColumns: DataTableColumn<Movement>[] = [
    {
      key: "order",
      header: "Ordre",
      cell: (r) => <span className="font-mono">{r.lineOrder}</span>,
      align: "right",
    },
    {
      key: "account",
      header: "Compte",
      cell: (r) => <span className="font-mono text-xs">{r.account}</span>,
    },
    {
      key: "side",
      header: "Côté",
      cell: (r) => (
        <Badge variant={r.side === LedgerSide.Debit ? "danger" : "success"}>
          {r.side === LedgerSide.Debit ? "D" : "C"}
        </Badge>
      ),
    },
    {
      key: "amount",
      header: "Montant",
      cell: (r) => (
        <span
          className={
            r.side === LedgerSide.Debit
              ? "font-mono text-destructive"
              : "font-mono text-success"
          }
        >
          {formatCurrency(r.amount, r.currency)}
        </span>
      ),
      align: "right",
    },
    {
      key: "code",
      header: "Code",
      cell: (r) => r.code ?? "—",
    },
    {
      key: "exploitant",
      header: "Exploitant",
      cell: (r) => r.exploitant ?? "—",
    },
    {
      key: "reference",
      header: "Référence",
      cell: (r) => r.reference ?? "—",
    },
    {
      key: "date",
      header: "Date transaction",
      cell: (r) => <span className="text-xs">{formatDate(r.transactionDate)}</span>,
    },
    {
      key: "fee",
      header: "Frais",
      cell: (r) =>
        r.isFee ? (
          <Badge variant="warning">Frais</Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ];

  return (
    <RoleGuard allow={(role) => hasRole(role, ROLE_FINANCE_SET)}>
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-3">
          <Link href="/transactions">
            <ChevronLeft /> Retour
          </Link>
        </Button>

        <PageHeader
          title="Détail transaction"
          description={
            <span className="font-mono text-xs">{tx.partnerTransactionRef}</span>
          }
          actions={
            balanced ? (
              <Badge variant="success" className="px-3 py-1">
                <CheckCircle2 className="mr-1 h-3 w-3" /> Équilibrée
              </Badge>
            ) : (
              <Badge variant="danger" className="px-3 py-1">
                <XCircle className="mr-1 h-3 w-3" /> Écart {formatCurrency(diff, currency)}
              </Badge>
            )
          }
        />

        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Métadonnées</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">ID</dt>
                <dd className="font-mono text-xs">{tx.id}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Partenaire</dt>
                <dd>
                  {partnerLabel
                    ? `${partnerLabel.code} — ${partnerLabel.name}`
                    : tx.partnerId}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Type</dt>
                <dd>
                  {TransactionTypeLabel[tx.transactionType as keyof typeof TransactionTypeLabel] ??
                    tx.transactionType}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Statut</dt>
                <dd>
                  <TransactionStatusBadge status={tx.status as TransactionStatus} />
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Montant</dt>
                <dd className="font-mono">{formatCurrency(tx.amount, tx.currency)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Frais / Net</dt>
                <dd className="font-mono">
                  {formatCurrency(tx.feeAmount, tx.currency)} /{" "}
                  {formatCurrency(tx.netAmount, tx.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Devise</dt>
                <dd>{tx.currency}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Initiée</dt>
                <dd>{formatDate(tx.initiatedAt)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Terminée</dt>
                <dd>{tx.completedAt ? formatDate(tx.completedAt) : "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Compte</dt>
                <dd className="font-mono text-xs">{tx.bankAccount ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Téléphone</dt>
                <dd className="font-mono text-xs">{tx.phoneNumber ?? "—"}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Tabs defaultValue="movements">
          <TabsList>
            <TabsTrigger value="movements">
              Mouvements ({rows.length})
            </TabsTrigger>
            <TabsTrigger value="json">JSON brut</TabsTrigger>
          </TabsList>

          <TabsContent value="movements" className="mt-4">
            <Card>
              <CardContent className="p-0 pt-0">
                <DataTable
                  data={rows}
                  loading={movLoading}
                  columns={movementColumns}
                  rowKey={(r) => r.id}
                  searchable={false}
                  emptyMessage="Aucun mouvement comptable."
                />
                {rows.length > 0 && (
                  <div className="border-t border-border px-4 py-3 text-sm">
                    <div className="flex flex-wrap gap-6">
                      <span>
                        Total débit :{" "}
                        <strong className="font-mono text-destructive">
                          {formatCurrency(totalDebit, currency)}
                        </strong>
                      </span>
                      <span>
                        Total crédit :{" "}
                        <strong className="font-mono text-success">
                          {formatCurrency(totalCredit, currency)}
                        </strong>
                      </span>
                      <span>
                        Équilibre :{" "}
                        <strong
                          className={
                            balanced ? "font-mono text-success" : "font-mono text-destructive"
                          }
                        >
                          {formatCurrency(diff, currency)}
                        </strong>
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="json" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Corps transaction (debug)</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="max-h-[480px] overflow-auto rounded-md bg-surface-muted p-4 font-mono text-xs">
                  {formatJsonBody(tx)}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </RoleGuard>
  );
}
