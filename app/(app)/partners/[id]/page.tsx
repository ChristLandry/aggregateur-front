"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft, KeyRound, Loader2, RefreshCw } from "lucide-react";
import { ApiKeyRevealCard } from "@/components/partners/ApiKeyRevealCard";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PartnerForm } from "@/components/forms/PartnerForm";
import { PartnerStatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  usePartner,
  useUpdatePartner,
  useChangePartnerStatus,
  useRotatePartnerKey,
  useSetPartnerBalance,
  usePartnerBalance,
} from "@/lib/api/partners";
import { PartnerStatus, PartnerStatusLabel } from "@/lib/enums";
import { balanceSchema, type BalanceFormValues } from "@/lib/schemas/partner";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function PartnerDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: partner, isLoading } = usePartner(id);
  const { data: balance } = usePartnerBalance(id);
  const update = useUpdatePartner(id);
  const changeStatus = useChangePartnerStatus(id);
  const rotateKey = useRotatePartnerKey(id);
  const setBalance = useSetPartnerBalance(id);
  const [revealedApiKey, setRevealedApiKey] = React.useState<string | null>(null);

  const balanceForm = useForm<BalanceFormValues>({
    resolver: zodResolver(balanceSchema),
    defaultValues: { balance: 0, reason: "" },
  });

  React.useEffect(() => {
    if (balance) balanceForm.reset({ balance: balance.balance, reason: "" });
  }, [balance, balanceForm]);

  if (isLoading || !partner) {
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
        <Link href="/partners">
          <ChevronLeft /> Retour
        </Link>
      </Button>

      <PageHeader
        title={partner.name}
        description={
          <span className="flex items-center gap-3">
            <code className="font-mono text-xs">{partner.code}</code>
            <PartnerStatusBadge status={partner.status} />
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Select
              value={String(partner.status)}
              onValueChange={(v) => changeStatus.mutate(Number(v))}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(PartnerStatus)
                  .filter((v): v is PartnerStatus => typeof v === "number")
                  .map((s) => (
                    <SelectItem key={s} value={String(s)}>
                      {PartnerStatusLabel[s]}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Button asChild variant="secondary">
              <Link href={`/partners/${id}/account`}>Compte miroir</Link>
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Informations</TabsTrigger>
          <TabsTrigger value="balance">Solde</TabsTrigger>
          <TabsTrigger value="security">Sécurité</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>Informations générales</CardTitle>
              <CardDescription>
                Seuls les champs modifiés seront envoyés (PATCH partiel).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PartnerForm
                key={partner.id}
                initial={partner}
                loading={update.isPending}
                onSubmit={async (patch) => {
                  if (Object.keys(patch).length === 0) {
                    toast.info("Aucun changement à enregistrer");
                    return;
                  }
                  try {
                    await update.mutateAsync(patch);
                  } catch {
                    /* toast via onError */
                  }
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balance">
          <Card>
            <CardHeader>
              <CardTitle>Solde du partenaire</CardTitle>
              <CardDescription>
                Solde actuel : {" "}
                <span className="font-mono">
                  {formatCurrency(balance?.balance ?? partner.balance, balance?.currency ?? partner.currency)}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...balanceForm}>
                <form
                  className="space-y-4"
                  onSubmit={balanceForm.handleSubmit((v) => setBalance.mutate(v))}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={balanceForm.control}
                      name="balance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nouveau solde</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={balanceForm.control}
                      name="reason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Motif</FormLabel>
                          <FormControl>
                            <Input placeholder="Ajustement manuel…" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" disabled={setBalance.isPending}>
                      {setBalance.isPending && <Loader2 className="animate-spin" />}
                      Mettre à jour
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Clé API</CardTitle>
              <CardDescription>
                Renouveler la clé API invalide immédiatement la précédente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!revealedApiKey && (
                <div className="flex items-start gap-3 rounded-md bg-surface-muted p-3 font-mono text-xs">
                  <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>••••••••••••••••••••••••</span>
                </div>
              )}
              {revealedApiKey && (
                <ApiKeyRevealCard
                  apiKey={revealedApiKey}
                  title="Nouvelle clé API"
                  onDismiss={() => setRevealedApiKey(null)}
                />
              )}
              <Button
                variant="destructive"
                onClick={() =>
                  rotateKey.mutate(undefined, {
                    onSuccess: (result) => setRevealedApiKey(result.apiKey),
                  })
                }
                disabled={rotateKey.isPending}
              >
                {rotateKey.isPending ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                Renouveler la clé
              </Button>
              <div className="text-xs text-muted-foreground">
                Dernière mise à jour : {partner.updatedAt ? formatDate(partner.updatedAt) : "—"}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
