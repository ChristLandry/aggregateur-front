"use client";

import * as React from "react";
import Link from "next/link";
import { Eye, Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PartnerForm } from "@/components/forms/PartnerForm";
import { PartnerStatusBadge } from "@/components/StatusBadge";
import { usePartners, useCreatePartner } from "@/lib/api/partners";
import { formatCurrency } from "@/lib/utils";
import type { Partner } from "@/lib/api/types";

export default function PartnersPage() {
  const { data, isLoading } = usePartners();
  const create = useCreatePartner();
  const [open, setOpen] = React.useState(false);

  const columns: DataTableColumn<Partner>[] = [
    {
      key: "code",
      header: "Code",
      cell: (r) => <span className="font-mono text-xs">{r.code}</span>,
      sortable: true,
      sortAccessor: (r) => r.code,
    },
    {
      key: "name",
      header: "Nom",
      cell: (r) => <span className="font-medium">{r.name}</span>,
      sortable: true,
      sortAccessor: (r) => r.name,
    },
    {
      key: "currency",
      header: "Devise",
      cell: (r) => r.currency,
    },
    {
      key: "balance",
      header: "Solde",
      cell: (r) => (
        <span className="font-mono">{formatCurrency(r.balance, r.currency)}</span>
      ),
      align: "right",
      sortable: true,
      sortAccessor: (r) => r.balance,
    },
    {
      key: "status",
      header: "Statut",
      cell: (r) => <PartnerStatusBadge status={r.status} />,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (r) => (
        <Button asChild variant="ghost" size="icon-sm">
          <Link href={`/partners/${r.id}`} aria-label="Voir">
            <Eye />
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Partenaires"
        description="Tous les partenaires intégrés sur la plateforme."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus /> Nouveau
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Créer un partenaire</DialogTitle>
              </DialogHeader>
              <PartnerForm
                onSubmit={async (v) => {
                  await create.mutateAsync(v);
                  setOpen(false);
                }}
                onCancel={() => setOpen(false)}
                loading={create.isPending}
                submitLabel="Créer"
              />
            </DialogContent>
          </Dialog>
        }
      />

      <DataTable
        data={data}
        loading={isLoading}
        columns={columns}
        rowKey={(r, i) => r.id ?? `partner-${i}`}
        searchPlaceholder="Rechercher un partenaire…"
        searchAccessor={(r) => `${r.name} ${r.code}`}
      />
    </div>
  );
}
