"use client";

import Link from "next/link";
import { Eye, Plus, Users } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/tables/DataTable";
import { useClients, type ClientSummary } from "@/lib/api/clients";
import { formatDateShort, shortId } from "@/lib/utils";

export default function ClientsPage() {
  const { data, isLoading, isError } = useClients();

  const columns: DataTableColumn<ClientSummary>[] = [
    {
      key: "root",
      header: "BankAccountRoot",
      cell: (r) => <span className="font-mono text-xs">{r.bankAccountRoot}</span>,
      sortable: true,
      sortAccessor: (r) => r.bankAccountRoot,
    },
    {
      key: "name",
      header: "Nom",
      cell: (r) => <span className="font-medium">{r.fullName || "—"}</span>,
      sortable: true,
      sortAccessor: (r) => r.fullName,
    },
    {
      key: "phone",
      header: "Téléphone",
      cell: (r) => r.phoneNumber ?? "—",
    },
    {
      key: "customers",
      header: "Customers",
      cell: (r) => (
        <span className="inline-flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          {r.customersCount}
        </span>
      ),
      align: "right",
      sortable: true,
      sortAccessor: (r) => r.customersCount,
    },
    {
      key: "created",
      header: "Créé le",
      cell: (r) => (
        <span className="text-xs text-muted-foreground">
          {r.createdAt ? formatDateShort(r.createdAt) : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (r) => (
        <Button asChild variant="ghost" size="icon-sm">
          <Link href={`/clients/${r.id}`} aria-label="Voir">
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
        description="Clients racines (BankAccountRoot) regroupant un Customer par partenaire souscrit."
        actions={
          <Button asChild>
            <Link href="/subscriptions/onboard">
              <Plus /> Nouveau client
            </Link>
          </Button>
        }
      />
      <DataTable
        data={data}
        loading={isLoading}
        columns={columns}
        rowKey={(r, i) => r.id || `client-${i}`}
        searchPlaceholder="Rechercher un client…"
        searchAccessor={(r) =>
          `${r.fullName} ${r.bankAccountRoot} ${r.phoneNumber ?? ""} ${r.id}`
        }
        emptyMessage={
          isError
            ? "Impossible de charger les clients."
            : "Aucun client racine. Lancez un onboarding pour en créer."
        }
      />
    </div>
  );
}
