"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/tables/DataTable";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SubscriptionForm } from "@/components/forms/SubscriptionForm";
import { SubscriptionStatusBadge } from "@/components/StatusBadge";
import {
  useSearchSubscriptions,
  useCreateSubscription,
  SUBSCRIPTION_STATUS_ALL,
  type SubscriptionSearchFilters,
} from "@/lib/api/subscriptions";
import { usePartners } from "@/lib/api/partners";
import { usePartnerStore } from "@/lib/partner/store";
import { getErrorMessage } from "@/lib/api/client";
import { SubscriptionStatus, SubscriptionStatusLabel } from "@/lib/enums";
import { WEB_PARTNER_CODE } from "@/lib/partner/constants";
import {
  DEFAULT_WEB_SUBSCRIPTION_TAKE,
  SUBSCRIPTION_PARTNER_WEB,
  isWebPartnerScope,
} from "@/lib/subscriptions/constants";
import { formatDateShort, shortId } from "@/lib/utils";
import type { Subscription } from "@/lib/api/types";
import {
  filtersFromSearchParams,
  searchParamsFromFilters,
} from "@/lib/subscriptions/url-filters";

function defaultDraft(applied: SubscriptionSearchFilters) {
  return {
    partnerScope: applied.partnerScope ?? SUBSCRIPTION_PARTNER_WEB,
    take: String(
      applied.take ??
        (isWebPartnerScope(applied.partnerScope)
          ? DEFAULT_WEB_SUBSCRIPTION_TAKE
          : ""),
    ),
    customerId: applied.customerId ?? "",
    phoneNumber: applied.phoneNumber ?? "",
    bankAccountNumber: applied.bankAccountNumber ?? "",
    phoneOperator: applied.phoneOperator ?? "",
    subscribedAtDebut: applied.subscribedAtDebut?.split("T")[0] ?? "",
    subscribedAtFin: applied.subscribedAtFin?.split("T")[0] ?? "",
    status:
      applied.status !== undefined
        ? applied.status === SUBSCRIPTION_STATUS_ALL
          ? SUBSCRIPTION_STATUS_ALL
          : String(applied.status)
        : SUBSCRIPTION_STATUS_ALL,
  };
}

function SubscriptionsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const applied = React.useMemo(
    () => filtersFromSearchParams(searchParams),
    [searchParams],
  );

  const [draft, setDraft] = React.useState(() => defaultDraft(applied));
  const { data: partners } = usePartners();
  const getApiKey = usePartnerStore((s) => s.getApiKey);

  React.useEffect(() => {
    setDraft(defaultDraft(applied));
  }, [applied]);

  const { data, isLoading, isError, error } = useSearchSubscriptions(applied);
  const create = useCreateSubscription(applied.partnerScope);
  const [open, setOpen] = React.useState(false);

  const isWebDraft = isWebPartnerScope(draft.partnerScope);

  function pushFilters(filters: SubscriptionSearchFilters) {
    const qs = searchParamsFromFilters(filters).toString();
    router.push(`/subscriptions?${qs}`);
  }

  function buildFiltersFromDraft(): SubscriptionSearchFilters {
    const filters: SubscriptionSearchFilters = {
      partnerScope: draft.partnerScope || SUBSCRIPTION_PARTNER_WEB,
      customerId: draft.customerId.trim() || undefined,
      phoneNumber: draft.phoneNumber.trim() || undefined,
      bankAccountNumber: draft.bankAccountNumber.trim() || undefined,
      phoneOperator: draft.phoneOperator.trim() || undefined,
      subscribedAtDebut: draft.subscribedAtDebut || undefined,
      subscribedAtFin: draft.subscribedAtFin || undefined,
    };

    const takeNum = Number(draft.take);
    if (!Number.isNaN(takeNum) && takeNum > 0) {
      filters.take = takeNum;
    } else if (isWebPartnerScope(filters.partnerScope)) {
      filters.take = DEFAULT_WEB_SUBSCRIPTION_TAKE;
    }

    if (draft.status === SUBSCRIPTION_STATUS_ALL) {
      filters.status = SUBSCRIPTION_STATUS_ALL;
    } else {
      const statusNum = Number(draft.status);
      if (!Number.isNaN(statusNum)) filters.status = statusNum;
    }
    return filters;
  }

  const columns: DataTableColumn<Subscription>[] = [
    {
      key: "id",
      header: "ID",
      cell: (r) => <span className="font-mono text-xs">{shortId(r.id)}</span>,
    },
    {
      key: "customer",
      header: "Client",
      cell: (r) =>
        r.customerId ? (
          <Link className="hover:underline" href={`/customers/${r.customerId}`}>
            <span className="font-mono text-xs">{shortId(r.customerId)}</span>
          </Link>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "phone",
      header: "Téléphone",
      cell: (r) => (
        <span className="text-xs">
          {r.phoneNumber ?? "—"}
          {r.phoneOperator ? ` (${r.phoneOperator})` : ""}
        </span>
      ),
    },
    {
      key: "bank",
      header: "Banque",
      cell: (r) => r.bankCode ?? "—",
    },
    {
      key: "status",
      header: "Statut",
      cell: (r) => <SubscriptionStatusBadge status={r.status} />,
    },
    {
      key: "dates",
      header: "Période",
      cell: (r) => (
        <span className="text-xs text-muted-foreground">
          {r.startDate ? formatDateShort(r.startDate) : "—"}
          {" → "}
          {r.endDate ? formatDateShort(r.endDate) : "∞"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (r) => (
        <Button asChild variant="ghost" size="icon-sm">
          <Link href={`/subscriptions/${r.id}`} aria-label="Voir">
            <Eye />
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <TooltipProvider delayDuration={200}>
      <div>
        <PageHeader
          title="Souscriptions"
          description="Choisissez le partenaire dans les filtres de recherche. WEB : jusqu'à 5000 lignes (take) selon les dates de souscription."
          actions={
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus /> Nouvelle
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Créer une souscription</DialogTitle>
                </DialogHeader>
                <SubscriptionForm
                  loading={create.isPending}
                  onCancel={() => setOpen(false)}
                  onSubmit={async (v) => {
                    const created = await create.mutateAsync(v);
                    setOpen(false);
                    if (created?.id) router.push(`/subscriptions/${created.id}`);
                  }}
                />
              </DialogContent>
            </Dialog>
          }
        />

        <Card className="mb-4">
          <CardContent className="grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
            <div className="space-y-1.5">
              <Label>Partenaire</Label>
              <Select
                value={draft.partnerScope}
                onValueChange={(v) =>
                  setDraft((d) => ({
                    ...d,
                    partnerScope: v,
                    take:
                      v === SUBSCRIPTION_PARTNER_WEB
                        ? String(DEFAULT_WEB_SUBSCRIPTION_TAKE)
                        : d.take,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Partenaire" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SUBSCRIPTION_PARTNER_WEB}>
                    {WEB_PARTNER_CODE} — Application web
                  </SelectItem>
                  {(partners ?? []).map((p) => {
                    if (!p.id) return null;
                    const hasKey = !!getApiKey(p.id);
                    const item = (
                      <SelectItem value={p.id} disabled={!hasKey}>
                        {p.code} — {p.name}
                        {!hasKey ? " (clé requise)" : ""}
                      </SelectItem>
                    );
                    if (!hasKey) {
                      return (
                        <Tooltip key={p.id}>
                          <TooltipTrigger asChild>
                            <div>{item}</div>
                          </TooltipTrigger>
                          <TooltipContent>Rotation de clé requise</TooltipContent>
                        </Tooltip>
                      );
                    }
                    return <React.Fragment key={p.id}>{item}</React.Fragment>;
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sub-take">Limite (take)</Label>
              <Input
                id="sub-take"
                type="number"
                min={1}
                max={5000}
                placeholder={isWebDraft ? String(DEFAULT_WEB_SUBSCRIPTION_TAKE) : "5000"}
                value={draft.take}
                onChange={(e) => setDraft((d) => ({ ...d, take: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sub-customer">Client (UUID)</Label>
              <Input
                id="sub-customer"
                placeholder="customerId"
                value={draft.customerId}
                onChange={(e) => setDraft((d) => ({ ...d, customerId: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sub-phone">Téléphone</Label>
              <Input
                id="sub-phone"
                value={draft.phoneNumber}
                onChange={(e) => setDraft((d) => ({ ...d, phoneNumber: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sub-bank">Compte bancaire</Label>
              <Input
                id="sub-bank"
                value={draft.bankAccountNumber}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, bankAccountNumber: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sub-operator">Opérateur</Label>
              <Input
                id="sub-operator"
                value={draft.phoneOperator}
                onChange={(e) => setDraft((d) => ({ ...d, phoneOperator: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sub-from">Souscrite depuis</Label>
              <Input
                id="sub-from"
                type="date"
                value={draft.subscribedAtDebut}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, subscribedAtDebut: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sub-to">Souscrite jusqu&apos;au</Label>
              <Input
                id="sub-to"
                type="date"
                value={draft.subscribedAtFin}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, subscribedAtFin: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label>Statut</Label>
              <Select
                value={draft.status}
                onValueChange={(v) => setDraft((d) => ({ ...d, status: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SUBSCRIPTION_STATUS_ALL}>Tous les statuts</SelectItem>
                  {Object.values(SubscriptionStatus)
                    .filter((v): v is SubscriptionStatus => typeof v === "number")
                    .map((s) => (
                      <SelectItem key={s} value={String(s)}>
                        {SubscriptionStatusLabel[s]}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2 md:col-span-2 lg:col-span-4 xl:col-span-8">
              <Button onClick={() => pushFilters(buildFiltersFromDraft())}>
                Rechercher
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  const reset: SubscriptionSearchFilters = {
                    partnerScope: SUBSCRIPTION_PARTNER_WEB,
                    take: DEFAULT_WEB_SUBSCRIPTION_TAKE,
                    status: SUBSCRIPTION_STATUS_ALL,
                  };
                  setDraft(defaultDraft(reset));
                  pushFilters(reset);
                }}
              >
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        <DataTable
          data={data}
          loading={isLoading}
          columns={columns}
          rowKey={(r, i) => r.id ?? `sub-${i}`}
          searchPlaceholder="Rechercher…"
          searchAccessor={(r) =>
            `${r.phoneNumber ?? ""} ${r.bankCode ?? ""} ${r.customerId ?? ""}`
          }
          emptyMessage={
            isError
              ? getErrorMessage(error, "Impossible de charger les souscriptions.")
              : "Aucune souscription trouvée pour ce partenaire et ces filtres."
          }
        />
      </div>
    </TooltipProvider>
  );
}

export default function SubscriptionsPage() {
  return (
    <React.Suspense fallback={<div className="p-6 text-muted-foreground">Chargement…</div>}>
      <SubscriptionsPageContent />
    </React.Suspense>
  );
}
