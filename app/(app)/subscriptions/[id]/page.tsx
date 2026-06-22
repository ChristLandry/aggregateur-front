"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { SubscriptionStatusBadge } from "@/components/StatusBadge";
import {
  useSubscription,
  useChangeSubscriptionStatus,
} from "@/lib/api/subscriptions";
import { SubscriptionStatus, SubscriptionStatusLabel } from "@/lib/enums";
import { formatDate } from "@/lib/utils";

export default function SubscriptionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useSubscription(id);
  const change = useChangeSubscriptionStatus(id, data?.partnerId);

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-3">
        <Link href="/subscriptions"><ChevronLeft /> Retour</Link>
      </Button>

      <PageHeader
        title={data.planCode ?? "Souscription"}
        description={<code className="font-mono text-xs">{data.id}</code>}
        actions={
          <Select
            value={String(data.status)}
            onValueChange={(v) => change.mutate(Number(v))}
          >
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.values(SubscriptionStatus)
                .filter((v): v is SubscriptionStatus => typeof v === "number")
                .map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    {SubscriptionStatusLabel[s]}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Détails</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-y-3 text-sm">
              <dt className="text-muted-foreground">Statut</dt>
              <dd><SubscriptionStatusBadge status={data.status} /></dd>
              <dt className="text-muted-foreground">Client</dt>
              <dd>
                <Link className="hover:underline" href={`/customers/${data.customerId}`}>
                  <span className="font-mono text-xs">{data.customerId}</span>
                </Link>
              </dd>
              <dt className="text-muted-foreground">Partenaire</dt>
              <dd className="font-mono text-xs">{data.partnerId}</dd>
              <dt className="text-muted-foreground">Date de début</dt>
              <dd>{data.startDate ? formatDate(data.startDate) : "—"}</dd>
              <dt className="text-muted-foreground">Date de fin</dt>
              <dd>{data.endDate ? formatDate(data.endDate) : "—"}</dd>
              <dt className="text-muted-foreground">Créé le</dt>
              <dd>{formatDate(data.createdAt)}</dd>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
