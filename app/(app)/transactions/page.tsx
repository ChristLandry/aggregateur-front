"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import { RoleGuard } from "@/components/AuthGuard";
import { ROLE_FINANCE_SET, hasRole } from "@/lib/auth/jwt";
import {
  TransactionType,
  TransactionTypeLabel,
  TransactionStatus,
  TransactionStatusLabel,
} from "@/lib/enums";
import { formatCurrency, formatDate, shortId } from "@/lib/utils";
import {
  useSearchTransactions,
  type TransactionSearchFilters,
} from "@/lib/api/transactions";
import { usePartners } from "@/lib/api/partners";
import type { Transaction } from "@/lib/api/types";
import {
  filtersFromSearchParams,
  searchParamsFromFilters,
} from "@/lib/transactions/url-filters";

const ALL = "__all__";

function signedAmountClass(type: number, amount: number): string {
  const isDebit =
    type === TransactionType.BankDebit || type === TransactionType.WalletDebit;
  if (isDebit) return "font-mono text-destructive";
  return "font-mono text-success";
}

function TransactionsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const applied = React.useMemo(
    () => filtersFromSearchParams(searchParams),
    [searchParams],
  );

  const [draft, setDraft] = React.useState({
    fromDate: applied.fromDate ?? "",
    toDate: applied.toDate ?? "",
    partnerId: applied.partnerId ?? ALL,
    status: applied.status !== undefined ? String(applied.status) : ALL,
    bankAccount: applied.bankAccount ?? "",
    phoneNumber: applied.phoneNumber ?? "",
    partnerTransactionRef: applied.partnerTransactionRef ?? "",
    type: applied.type !== undefined ? String(applied.type) : ALL,
  });

  React.useEffect(() => {
    setDraft({
      fromDate: applied.fromDate ?? "",
      toDate: applied.toDate ?? "",
      partnerId: applied.partnerId ?? ALL,
      status: applied.status !== undefined ? String(applied.status) : ALL,
      bankAccount: applied.bankAccount ?? "",
      phoneNumber: applied.phoneNumber ?? "",
      partnerTransactionRef: applied.partnerTransactionRef ?? "",
      type: applied.type !== undefined ? String(applied.type) : ALL,
    });
  }, [applied]);

  const { data, isLoading } = useSearchTransactions(applied);
  const { data: partners } = usePartners();

  const partnerNameById = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const p of partners ?? []) {
      if (p.id) m.set(p.id, `${p.code} — ${p.name}`);
    }
    return m;
  }, [partners]);

  function pushFilters(next: TransactionSearchFilters) {
    const qs = searchParamsFromFilters(next).toString();
    router.push(qs ? `/transactions?${qs}` : "/transactions");
  }

  function applySearch() {
    pushFilters({
      fromDate: draft.fromDate || undefined,
      toDate: draft.toDate || undefined,
      partnerId: draft.partnerId === ALL ? undefined : draft.partnerId,
      status: draft.status === ALL ? undefined : Number(draft.status),
      bankAccount: draft.bankAccount.trim() || undefined,
      phoneNumber: draft.phoneNumber.trim() || undefined,
      partnerTransactionRef: draft.partnerTransactionRef.trim() || undefined,
      type: draft.type === ALL ? undefined : Number(draft.type),
      page: 1,
      pageSize: applied.pageSize ?? 50,
    });
  }

  function resetFilters() {
    router.push("/transactions");
  }

  const items = data?.items ?? [];
  const page = data?.page ?? 1;
  const pageSize = data?.pageSize ?? 50;
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const columns: DataTableColumn<Transaction>[] = [
    {
      key: "date",
      header: "Date",
      cell: (r) => <span className="text-xs">{formatDate(r.initiatedAt)}</span>,
    },
    {
      key: "partner",
      header: "Partenaire",
      cell: (r) => (
        <span className="text-xs">
          {partnerNameById.get(r.partnerId) ?? shortId(r.partnerId)}
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
      key: "status",
      header: "Statut",
      cell: (r) => (
        <TransactionStatusBadge status={r.status as TransactionStatus} />
      ),
    },
    {
      key: "amount",
      header: "Montant",
      cell: (r) => (
        <span className={signedAmountClass(r.transactionType, r.amount)}>
          {formatCurrency(r.amount, r.currency)}
        </span>
      ),
      align: "right",
    },
    {
      key: "fee",
      header: "Frais",
      cell: (r) => (
        <span className="font-mono text-xs text-muted-foreground">
          {formatCurrency(r.feeAmount, r.currency)}
        </span>
      ),
      align: "right",
    },
    {
      key: "net",
      header: "Net",
      cell: (r) => (
        <span className="font-mono text-xs">
          {formatCurrency(r.netAmount, r.currency)}
        </span>
      ),
      align: "right",
    },
    {
      key: "bank",
      header: "Compte",
      cell: (r) => (
        <span className="font-mono text-xs">{r.bankAccount ?? "—"}</span>
      ),
    },
    {
      key: "phone",
      header: "Téléphone",
      cell: (r) => (
        <span className="font-mono text-xs">{r.phoneNumber ?? "—"}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (r) => (
        <Button asChild variant="ghost" size="icon-sm">
          <Link href={`/transactions/${r.id}`} aria-label="Voir">
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
          description="Recherche admin sur l'ensemble des transactions financières."
        />

        <Card className="mb-4">
          <CardContent className="pt-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
              <div className="space-y-1">
                <Label>Date début</Label>
                <Input
                  type="date"
                  value={draft.fromDate}
                  onChange={(e) => setDraft((d) => ({ ...d, fromDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Date fin</Label>
                <Input
                  type="date"
                  value={draft.toDate}
                  onChange={(e) => setDraft((d) => ({ ...d, toDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Partenaire</Label>
                <Select
                  value={draft.partnerId}
                  onValueChange={(v) => setDraft((d) => ({ ...d, partnerId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Tous</SelectItem>
                    {(partners ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.code} — {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Statut</Label>
                <Select
                  value={draft.status}
                  onValueChange={(v) => setDraft((d) => ({ ...d, status: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Tous</SelectItem>
                    {Object.values(TransactionStatus)
                      .filter((v): v is TransactionStatus => typeof v === "number")
                      .map((s) => (
                        <SelectItem key={s} value={String(s)}>
                          {TransactionStatusLabel[s]}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Type</Label>
                <Select
                  value={draft.type}
                  onValueChange={(v) => setDraft((d) => ({ ...d, type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Tous</SelectItem>
                    {Object.values(TransactionType)
                      .filter((v): v is TransactionType => typeof v === "number")
                      .map((t) => (
                        <SelectItem key={t} value={String(t)}>
                          {TransactionTypeLabel[t]}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Compte bancaire</Label>
                <Input
                  value={draft.bankAccount}
                  onChange={(e) => setDraft((d) => ({ ...d, bankAccount: e.target.value }))}
                  placeholder="08584110023"
                />
              </div>
              <div className="space-y-1">
                <Label>Téléphone</Label>
                <Input
                  value={draft.phoneNumber}
                  onChange={(e) => setDraft((d) => ({ ...d, phoneNumber: e.target.value }))}
                  placeholder="0748556806"
                />
              </div>
              <div className="space-y-1 lg:col-span-2">
                <Label>Référence partenaire</Label>
                <Input
                  value={draft.partnerTransactionRef}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, partnerTransactionRef: e.target.value }))
                  }
                  placeholder="REF-…"
                />
              </div>
              <div className="flex items-end gap-2 sm:col-span-2">
                <Button onClick={applySearch} className="flex-1">
                  Rechercher
                </Button>
                <Button type="button" variant="ghost" onClick={resetFilters}>
                  Reset
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
          emptyMessage="Aucune transaction trouvée."
        />

        {!isLoading && total > 0 && (
          <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} sur {total}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={page <= 1}
                onClick={() =>
                  pushFilters({ ...applied, page: page - 1, pageSize })
                }
              >
                Précédent
              </Button>
              <span>
                {page} / {pageCount}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={page >= pageCount}
                onClick={() =>
                  pushFilters({ ...applied, page: page + 1, pageSize })
                }
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}

export default function TransactionsPage() {
  return (
    <React.Suspense fallback={<div className="p-6 text-muted-foreground">Chargement…</div>}>
      <TransactionsPageContent />
    </React.Suspense>
  );
}
