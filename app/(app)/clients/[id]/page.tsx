"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, Eye, Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, type DataTableColumn } from "@/components/tables/DataTable";
import { CustomerStatusBadge, KycStatusBadge } from "@/components/StatusBadge";
import { useClient, type ClientCustomer } from "@/lib/api/clients";
import { formatDate, formatDateShort, shortId } from "@/lib/utils";

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: client, isLoading, isError, error } = useClient(id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !client) {
    return (
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-3">
          <Link href="/clients">
            <ChevronLeft /> Retour
          </Link>
        </Button>
        <PageHeader
          title="Client introuvable"
          description={
            error instanceof Error
              ? error.message
              : "CLIENT_NOT_FOUND — ce client n'existe pas."
          }
        />
      </div>
    );
  }

  const columns: DataTableColumn<ClientCustomer>[] = [
    {
      key: "id",
      header: "CustomerId",
      cell: (r) => <span className="font-mono text-xs">{shortId(r.id)}</span>,
    },
    {
      key: "name",
      header: "Nom",
      cell: (r) => <span className="font-medium">{r.fullName || "—"}</span>,
    },
    {
      key: "status",
      header: "Statut",
      cell: (r) => <CustomerStatusBadge status={r.status} />,
    },
    {
      key: "kyc",
      header: "KYC",
      cell: (r) => <KycStatusBadge status={r.kycStatus} />,
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
          <Link
            href={`/subscriptions?customerId=${r.id}`}
            aria-label="Voir souscriptions"
          >
            <Eye />
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-3">
        <Link href="/clients">
          <ChevronLeft /> Retour
        </Link>
      </Button>

      <PageHeader
        title={client.fullName || "Client"}
        description={
          <span className="flex flex-wrap items-center gap-3">
            <code className="font-mono text-xs">{client.bankAccountRoot}</code>
            <span className="text-muted-foreground">
              {client.customers.length} customer(s)
            </span>
          </span>
        }
        actions={
          <Button asChild>
            <Link href="/subscriptions/onboard">
              <Plus /> Nouvelle souscription
            </Link>
          </Button>
        }
      />

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Identité racine</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">ClientId</dt>
              <dd className="font-mono text-xs break-all">{client.id}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">BankAccountRoot</dt>
              <dd className="font-mono text-xs">{client.bankAccountRoot}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Téléphone</dt>
              <dd>{client.phoneNumber ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd>{client.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Date de naissance</dt>
              <dd>{client.dateOfBirth ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">NationalId</dt>
              <dd className="font-mono text-xs">{client.nationalId ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Créé le</dt>
              <dd>{client.createdAt ? formatDate(client.createdAt) : "—"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Customers (par partenaire)</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pt-0">
          <DataTable
            data={client.customers}
            columns={columns}
            rowKey={(r, i) => r.id || `cu-${i}`}
            searchable={false}
            emptyMessage="Aucun customer rattaché. Lancez un onboarding pour ce BankAccountRoot."
          />
        </CardContent>
      </Card>
    </div>
  );
}
