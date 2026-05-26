"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, CheckCircle2, XCircle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AccountingStatusBadge, TransactionStatusBadge } from "@/components/StatusBadge";
import { RoleGuard } from "@/components/AuthGuard";
import { useTransaction, useTransactionMovements } from "@/lib/api/accounting";
import { ROLE_FINANCE_SET, hasRole } from "@/lib/auth/jwt";
import {
  LedgerSide,
  TransactionStatus,
  TransactionTypeLabel,
} from "@/lib/enums";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: tx, isLoading: txLoading } = useTransaction(id);
  const { data: movements, isLoading: movLoading } = useTransactionMovements(id);

  const isLoading = txLoading || movLoading;
  const data = movements ?? [];

  if (isLoading || !tx) {
    return (
      <RoleGuard allow={(role) => hasRole(role, ROLE_FINANCE_SET)}>
        <Skeleton className="h-64 w-full" />
      </RoleGuard>
    );
  }

  const totalDebit = data
    .filter((m) => m.side === LedgerSide.Debit)
    .reduce((s, m) => s + Math.abs(m.amount), 0);
  const totalCredit = data
    .filter((m) => m.side === LedgerSide.Credit)
    .reduce((s, m) => s + Math.abs(m.amount), 0);
  const diff = totalCredit - totalDebit;
  const balanced = Math.abs(diff) < 0.01;
  const currency = data[0]?.currency ?? tx.currency;

  return (
    <RoleGuard allow={(role) => hasRole(role, ROLE_FINANCE_SET)}>
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-3">
          <Link href="/accounting/transactions"><ChevronLeft /> Retour aux transactions</Link>
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
                <XCircle className="mr-1 h-3 w-3" /> Déséquilibre {formatCurrency(diff, currency)}
              </Badge>
            )
          }
        />

        <Card className="mb-4">
          <CardHeader><CardTitle>Transaction</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
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
                  {formatCurrency(tx.feeAmount, tx.currency)} / {formatCurrency(tx.netAmount, tx.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Initiée le</dt>
                <dd>{formatDate(tx.initiatedAt)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Compte bancaire</dt>
                <dd className="font-mono text-xs">{tx.bankAccount ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Téléphone</dt>
                <dd className="font-mono text-xs">{tx.phoneNumber ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">ID technique</dt>
                <dd className="font-mono text-xs">{tx.id}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mouvements comptables générés ({data.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Aucun mouvement comptable pour cette transaction.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Compte</TableHead>
                    <TableHead>Côté</TableHead>
                    <TableHead className="text-right">Débit</TableHead>
                    <TableHead className="text-right">Crédit</TableHead>
                    <TableHead>Libellé</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-mono text-xs">{m.account}</TableCell>
                      <TableCell>
                        <Badge variant={m.side === LedgerSide.Debit ? "danger" : "success"}>
                          {m.side === LedgerSide.Debit ? "D" : "C"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {m.side === LedgerSide.Debit
                          ? formatCurrency(Math.abs(m.amount), m.currency)
                          : ""}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {m.side === LedgerSide.Credit
                          ? formatCurrency(Math.abs(m.amount), m.currency)
                          : ""}
                      </TableCell>
                      <TableCell>{m.label ?? "—"}</TableCell>
                      <TableCell><AccountingStatusBadge status={m.status} /></TableCell>
                      <TableCell className="text-xs">{formatDate(m.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={2} className="font-medium">Totaux</TableCell>
                    <TableCell className="text-right font-mono text-destructive">
                      {formatCurrency(totalDebit, currency)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-success">
                      {formatCurrency(totalCredit, currency)}
                    </TableCell>
                    <TableCell colSpan={3} />
                  </TableRow>
                </TableFooter>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
