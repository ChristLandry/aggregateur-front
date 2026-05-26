"use client";

import * as React from "react";
import Link from "next/link";
import { Eye } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/tables/DataTable";
import { RoleGuard } from "@/components/AuthGuard";
import { EndpointCell } from "@/components/partner-endpoints/EndpointCell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePartners } from "@/lib/api/partners";
import {
  indexEndpointsByCell,
  usePartnerEndpoints,
} from "@/lib/api/partner-endpoints";
import { ROLE_FINANCE_SET, hasRole } from "@/lib/auth/jwt";
import {
  FINANCIAL_ENDPOINT_KEYS,
  FinancialEndpointKey,
  FinancialEndpointKeyLabel,
} from "@/lib/enums";
import type { Partner } from "@/lib/api/types";

export default function PartnerEndpointsPage() {
  const { data: partners, isLoading: partnersLoading } = usePartners();
  const { data: endpoints, isLoading: endpointsLoading } = usePartnerEndpoints();
  const endpointIndex = React.useMemo(
    () => indexEndpointsByCell(endpoints),
    [endpoints],
  );

  const columns: DataTableColumn<Partner>[] = [
    {
      key: "partner",
      header: "Partenaire",
      cell: (p) => (
        <div>
          <div className="font-medium">{p.name}</div>
          <div className="font-mono text-xs text-muted-foreground">{p.code}</div>
        </div>
      ),
      sortable: true,
      sortAccessor: (p) => `${p.name} ${p.code}`,
    },
    ...FINANCIAL_ENDPOINT_KEYS.map((key) => ({
      key: `endpoint-${key}`,
      header: FinancialEndpointKeyLabel[key as FinancialEndpointKey],
      cell: (p: Partner) => (
        <EndpointCell
          partner={p}
          endpointKey={key as FinancialEndpointKey}
          endpoint={endpointIndex.get(`${p.id}:${key}`)}
        />
      ),
      className: "align-top",
    })),
    {
      key: "actions",
      header: "Actions",
      align: "right" as const,
      cell: (p) => (
        <Button asChild variant="ghost" size="icon-sm">
          <Link href={`/partners/${p.id}`} aria-label="Voir le partenaire" title="Voir le partenaire">
            <Eye />
          </Link>
        </Button>
      ),
    },
  ];

  const loading = partnersLoading || endpointsLoading;

  return (
    <RoleGuard allow={(role) => hasRole(role, ROLE_FINANCE_SET)}>
      <div className="space-y-6">
        <PageHeader
          title="Endpoints partenaires"
          description="Matrice d'éligibilité et de rattachement des schémas comptables par partenaire et type d'opération."
        />

        <Card>
          <CardHeader>
            <CardTitle>Éligibilité &amp; schémas comptables par partenaire</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              data={partners}
              loading={loading}
              columns={columns}
              rowKey={(p) => p.id}
              searchPlaceholder="Rechercher par code ou nom…"
              searchAccessor={(p) => `${p.code} ${p.name}`}
              emptyMessage="Aucun partenaire trouvé."
            />
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
