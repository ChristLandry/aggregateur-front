"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CustomerForm } from "@/components/forms/CustomerForm";
import { SubscriptionForm } from "@/components/forms/SubscriptionForm";
import {
  useCustomer,
  useCustomerSubscriptions,
  useUpdateCustomer,
  useCreateCustomerSubscription,
} from "@/lib/api/customers";
import { CustomerStatusBadge, KycStatusBadge, SubscriptionStatusBadge } from "@/components/StatusBadge";
import { formatDateShort } from "@/lib/utils";
import { toast } from "sonner";

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: customer, isLoading } = useCustomer(id);
  const { data: subs } = useCustomerSubscriptions(id);
  const update = useUpdateCustomer(id);
  const createSub = useCreateCustomerSubscription(id);
  const [subOpen, setSubOpen] = React.useState(false);

  if (isLoading || !customer) {
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
        <Link href="/customers"><ChevronLeft /> Retour</Link>
      </Button>

      <PageHeader
        title={`${customer.firstName} ${customer.lastName}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <code className="font-mono text-xs">{customer.id}</code>
            <CustomerStatusBadge status={customer.status} />
            <KycStatusBadge status={customer.kycStatus} />
          </span>
        }
      />

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Informations</TabsTrigger>
          <TabsTrigger value="subs">Souscriptions ({subs?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardHeader><CardTitle>Édition du client</CardTitle></CardHeader>
            <CardContent>
              <CustomerForm
                initial={customer}
                loading={update.isPending}
                onSubmit={async (patch) => {
                  if (Object.keys(patch).length === 0) {
                    toast.info("Aucun changement à enregistrer");
                    return;
                  }
                  await update.mutateAsync(patch);
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subs">
          <div className="mb-4 flex justify-end">
            <Dialog open={subOpen} onOpenChange={setSubOpen}>
              <DialogTrigger asChild>
                <Button><Plus /> Nouvelle souscription</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Créer une souscription</DialogTitle>
                </DialogHeader>
                <SubscriptionForm
                  defaultCustomerId={id}
                  lockCustomerId
                  loading={createSub.isPending}
                  onCancel={() => setSubOpen(false)}
                  onSubmit={async (v) => {
                    await createSub.mutateAsync(v);
                    setSubOpen(false);
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              {(subs ?? []).length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">Aucune souscription</div>
              ) : (
                <ul className="divide-y divide-border">
                  {(subs ?? []).map((s, i) => (
                    <li key={s.id ?? `sub-${i}`} className="flex items-center justify-between p-4">
                      <div>
                        <Link
                          href={`/subscriptions/${s.id}`}
                          className="font-medium hover:underline"
                        >
                          {s.phoneNumber ?? "—"}
                          {s.phoneOperator ? ` · ${s.phoneOperator}` : ""}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {s.bankCode ?? "—"}
                          {" · "}
                          {s.startDate ? formatDateShort(s.startDate) : "—"}
                          {" → "}
                          {s.endDate ? formatDateShort(s.endDate) : "∞"}
                        </div>
                      </div>
                      <SubscriptionStatusBadge status={s.status} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
