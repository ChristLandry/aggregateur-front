"use client";

import * as React from "react";
import Link from "next/link";
import { Eye, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/tables/DataTable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CustomerForm } from "@/components/forms/CustomerForm";
import { useCreateCustomer, useCustomers } from "@/lib/api/customers";
import { useHasPartnerApiContext } from "@/lib/partner/context";
import { CustomerStatusLabel, KycStatusLabel } from "@/lib/enums";
import type { Customer } from "@/lib/api/types";

export default function CustomersPage() {
  const router = useRouter();
  const hasApiContext = useHasPartnerApiContext();
  const { data, isLoading, isError } = useCustomers();
  const create = useCreateCustomer();
  const [open, setOpen] = React.useState(false);

  const columns: DataTableColumn<Customer>[] = [
    {
      key: "id",
      header: "ID",
      cell: (r) => <span className="font-mono text-xs">{r.id}</span>,
    },
    {
      key: "name",
      header: "Nom complet",
      cell: (r) => <span className="font-medium">{`${r.firstName} ${r.lastName}`.trim()}</span>,
      sortable: true,
      sortAccessor: (r) => `${r.firstName} ${r.lastName}`.trim(),
    },
    {
      key: "email",
      header: "Email",
      cell: (r) => r.email ?? "—",
    },
    {
      key: "status",
      header: "Statut",
      cell: (r) => CustomerStatusLabel[r.status as keyof typeof CustomerStatusLabel] ?? String(r.status),
    },
    {
      key: "kyc",
      header: "KYC",
      cell: (r) => KycStatusLabel[r.kycStatus as keyof typeof KycStatusLabel] ?? String(r.kycStatus),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      cell: (r) => (
        <Button asChild variant="ghost" size="icon-sm">
          <Link href={`/customers/${r.id}`} aria-label="Voir" title="Voir le client">
            <Eye />
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Clients"
        description="Liste des clients et création d'un nouveau client."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus /> Nouveau
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Créer un client</DialogTitle>
              </DialogHeader>
              <CustomerForm
                loading={create.isPending}
                onCancel={() => setOpen(false)}
                onSubmit={async (v) => {
                  const created = await create.mutateAsync(v);
                  setOpen(false);
                  router.push(`/customers/${created.id}`);
                }}
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
        rowKey={(r, i) => r.id ?? `customer-${i}`}
        searchPlaceholder="Rechercher un client…"
        searchAccessor={(r) => `${r.firstName} ${r.lastName} ${r.email ?? ""} ${r.id}`}
        emptyMessage={
          !hasApiContext
            ? "Clé API partenaire non configurée (NEXT_PUBLIC_WEB_PARTNER_APIKEY)."
            : isError
              ? "Impossible de charger la liste des clients."
              : "Aucun client trouvé."
        }
      />
    </div>
  );
}
