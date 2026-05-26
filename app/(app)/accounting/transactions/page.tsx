"use client";

import * as React from "react";
import Link from "next/link";
import { Eye } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/tables/DataTable";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TransactionStatusBadge } from "@/components/StatusBadge";
import { useTransactions } from "@/lib/api/accounting";
import { usePartners } from "@/lib/api/partners";
import { RoleGuard } from "@/components/AuthGuard";
import { ROLE_FINANCE_SET, hasRole } from "@/lib/auth/jwt";
import {
  TransactionTypeLabel,
  TransactionStatus,
} from "@/lib/enums";
import { formatCurrency, formatDate, shortId } from "@/lib/utils";
import type { Transaction } from "@/lib/api/types";

const ALL_PARTNERS = "__all__";

export default function TransactionsPage() {
  const { data: partners } = usePartners();
  const [partnerId, setPartnerId] = React.useState(ALL_PARTNERS);
  const [account, setAccount] = React.useState("");
  const [phoneNumber, setPhoneNumber] = React.useState("");
  const [number, setNumber] = React.useState("");
  const [fromDate, setFromDate] = React.useState("");
  const [toDate, setToDate] = React.useState("");
  const [applied, setApplied] = React.useState({
    partnerId: undefined as string | undefined,
    account: undefined as string | undefined,
    phoneNumber: undefined as string | undefined,
    number: undefined as string | undefined,
    fromDate: undefined as string | undefined,
    toDate: undefined as string | undefined,
    page: 1,
    pageSize: 50,
  });

  const { data, isLoading } = useTransactions(applied);
  const items = data?.items ?? [];

  function applyFilters() {
    setApplied({
      partnerId: partnerId === ALL_PARTNERS ? undefined : partnerId,
      account: account.trim() || undefined,
      phoneNumber: phoneNumber.trim() || undefined,
      number: number.trim() || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      page: 1,
      pageSize: 50,
    });
  }

  function resetFilters() {
    setPartnerId(ALL_PARTNERS);
    setAccount("");
    setPhoneNumber("");
    setNumber("");
    setFromDate("");
    setToDate("");
    setApplied({
      partnerId: undefined,
      account: undefined,
      phoneNumber: undefined,
      number: undefined,
      fromDate: undefined,
      toDate: undefined,
      page: 1,
      pageSize: 50,
    });
  }

  const columns: DataTableColumn<Transaction>[] = [
    {
      key: "date",
      header: "Date",
      cell: (r) => <span className="text-xs">{formatDate(r.initiatedAt)}</span>,
      sortable: true,
      sortAccessor: (r) => r.initiatedAt,
    },
    {
      key: "ref",
      header: "Référence",
      cell: (r) => (
        <span className="font-mono text-xs" title={r.partnerTransactionRef}>
          {r.partnerTransactionRef}
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      cell: (r) =>
        TransactionTypeLabel[r.transactionType as keyof typeof TransactionTypeLabel] ??
        String(r.transactionType),
    },
    {
      key: "amount",
      header: "Montant",
      cell: (r) => (
        <span className="font-mono">{formatCurrency(r.amount, r.currency)}</span>
      ),
      align: "right",
      sortable: true,
      sortAccessor: (r) => r.amount,
    },
    {
      key: "status",
      header: "Statut",
      cell: (r) => (
        <TransactionStatusBadge status={r.status as TransactionStatus} />
      ),
    },
    {
      key: "partner",
      header: "Partenaire",
      cell: (r) => <span className="font-mono text-xs">{shortId(r.partnerId)}</span>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (r) => (
        <Button asChild variant="ghost" size="icon-sm">
          <Link
            href={`/accounting/transactions/${r.id}`}
            aria-label="Voir les mouvements"
            title="Mouvements comptables"
          >
            <Eye />
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <RoleGuard allow={(role) => hasRole(role, ROLE_FINANCE_SET)}>
      <div>
        <PageHeader
          title="Transactions"
          description="Rechercher par partenaire, compte bancaire, téléphone ou référence. Les dates limitent la période si renseignées."
        />

        <Card className="mb-4">
          <CardContent className="pt-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <Label>Partenaire</Label>
                <Select value={partnerId} onValueChange={setPartnerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_PARTNERS}>Tous les partenaires</SelectItem>
                    {(partners ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.code} — {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Compte bancaire</Label>
                <Input
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  placeholder="08584110023"
                />
              </div>
              <div className="space-y-1">
                <Label>Téléphone / numéro</Label>
                <Input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="0748556806"
                />
              </div>
              <div className="space-y-1">
                <Label>Référence partenaire</Label>
                <Input
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="REF-…"
                />
              </div>
              <div className="space-y-1">
                <Label>Date début</Label>
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Date fin</Label>
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
              <div className="flex items-end gap-2 sm:col-span-2">
                <Button onClick={applyFilters} className="flex-1">
                  Rechercher
                </Button>
                <Button type="button" variant="outline" onClick={resetFilters}>
                  Réinitialiser
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <DataTable
          data={items}
          loading={isLoading}
          columns={columns}
          rowKey={(r) => r.id}
          searchable={false}
          emptyMessage="Aucune transaction trouvée pour ces critères."
        />
      </div>
    </RoleGuard>
  );
}
