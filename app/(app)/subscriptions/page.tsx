"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SubscriptionForm } from "@/components/forms/SubscriptionForm";
import { SubscriptionStatusBadge } from "@/components/StatusBadge";
import {
  useSubscriptions,
  useCreateSubscription,
} from "@/lib/api/subscriptions";
import { formatDateShort, shortId } from "@/lib/utils";
import type { Subscription } from "@/lib/api/types";

export default function SubscriptionsPage() {
  const router = useRouter();
  const [customerFilter, setCustomerFilter] = React.useState<string>("");
  const { data, isLoading } = useSubscriptions(customerFilter || null);
  const create = useCreateSubscription();
  const [open, setOpen] = React.useState(false);

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
          <Link href={`/subscriptions/${r.id}`} aria-label="Voir"><Eye /></Link>
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Souscriptions"
        description="Filtrer par client ou rechercher dans la liste."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus /> Nouvelle</Button>
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

      <DataTable
        data={data}
        loading={isLoading}
        columns={columns}
        rowKey={(r, i) => r.id ?? `sub-${i}`}
        searchPlaceholder="Rechercher…"
        searchAccessor={(r) =>
          `${r.phoneNumber ?? ""} ${r.bankCode ?? ""} ${r.customerId ?? ""}`
        }
        toolbar={
          <Input
            placeholder="Filtrer par client (UUID)"
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            className="w-[280px]"
          />
        }
      />
    </div>
  );
}
