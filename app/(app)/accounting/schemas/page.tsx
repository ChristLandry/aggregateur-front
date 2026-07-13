"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, GitCompare, Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SchemaForm } from "@/components/forms/SchemaForm";
import { RoleGuard } from "@/components/AuthGuard";
import {
  useAccountingSchemas,
  useCreateSchema,
} from "@/lib/api/accounting";
import { TransactionTypeLabel } from "@/lib/enums";
import { ROLE_FINANCE_SET, hasRole } from "@/lib/auth/jwt";
import type { AccountingSchema } from "@/lib/api/types";

export default function SchemasPage() {
  const router = useRouter();
  const { data, isLoading } = useAccountingSchemas();
  const create = useCreateSchema();
  const [open, setOpen] = React.useState(false);
  const [compareA, setCompareA] = React.useState<string | null>(null);
  const [compareB, setCompareB] = React.useState<string | null>(null);

  const columns: DataTableColumn<AccountingSchema>[] = [
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
      key: "type",
      header: "Type",
      cell: (r) => TransactionTypeLabel[r.transactionType as keyof typeof TransactionTypeLabel],
    },
    {
      key: "lines",
      header: "Lignes",
      cell: (r) => <span className="font-mono">{r.lines?.length ?? 0}</span>,
      align: "right",
    },
    {
      key: "active",
      header: "Actif",
      cell: (r) =>
        r.isActive ? (
          <Badge variant="success">Oui</Badge>
        ) : (
          <Badge variant="muted">Non</Badge>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      cell: (r) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Sélectionner pour comparaison"
            title="Sélectionner pour comparaison"
            onClick={() => {
              if (!compareA) setCompareA(r.id);
              else if (!compareB && r.id !== compareA) setCompareB(r.id);
              else {
                setCompareA(r.id);
                setCompareB(null);
              }
            }}
            className={
              r.id === compareA || r.id === compareB ? "text-accent" : undefined
            }
          >
            <GitCompare />
          </Button>
          <Button asChild variant="ghost" size="icon-sm">
            <Link href={`/accounting/schemas/${r.id}`} aria-label="Voir" title="Voir le schéma"><Eye /></Link>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <RoleGuard allow={(role) => hasRole(role, ROLE_FINANCE_SET)}>
      <div>
        <PageHeader
          title="Schémas comptables"
          description="Définissez la mécanique des mouvements générés par chaque type de transaction."
          actions={
            <>
            {compareA && compareB && (
              <Button asChild variant="secondary">
                <Link href={`/accounting/schemas/compare?ids=${compareA},${compareB}`}>
                  <GitCompare /> Comparer
                </Link>
              </Button>
            )}
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus /> Nouveau schéma</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Créer un schéma</DialogTitle>
                </DialogHeader>
                <SchemaForm
                  loading={create.isPending}
                  onCancel={() => setOpen(false)}
                  onSubmit={async (v) => {
                    try {
                      const created = await create.mutateAsync(v);
                      setOpen(false);
                      if (created?.id) router.push(`/accounting/schemas/${created.id}`);
                    } catch {
                      /* toast via onError */
                    }
                  }}
                  submitLabel="Créer"
                />
              </DialogContent>
            </Dialog>
            </>
          }
        />
        <DataTable
          data={data}
          loading={isLoading}
          columns={columns}
          rowKey={(r, i) => r.id ?? `schema-${i}`}
          searchPlaceholder="Rechercher un schéma…"
          searchAccessor={(r) => `${r.name} ${r.code}`}
        />
      </div>
    </RoleGuard>
  );
}
