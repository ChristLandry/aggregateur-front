"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Link2, Unlink } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { usePartners } from "@/lib/api/partners";
import { useWalletLink, useWalletUnlink } from "@/lib/api/wallet";
import { resolveWalletErrorMessage } from "@/lib/api/wallet-errors";
import { usePartnerStore } from "@/lib/partner/store";
import { WEB_PARTNER_CODE } from "@/lib/partner/constants";
import { PartnerStatus } from "@/lib/enums";
import { ApiError } from "@/lib/api/client";

const linkSchema = z.object({
  phoneNumber: z.string().min(1, "Téléphone requis").max(20),
  partnerRef: z.string().min(1, "Référence partenaire requise").max(100),
  bankAccount: z.string().min(1, "Compte bancaire requis").max(50),
});

const unlinkSchema = z
  .object({
    linkId: z.string().max(100).optional().or(z.literal("")),
    phoneNumber: z.string().max(20).optional().or(z.literal("")),
    partnerRef: z.string().max(100).optional().or(z.literal("")),
  })
  .refine((v) => !!(v.linkId?.trim() || v.phoneNumber?.trim()), {
    message: "Indiquez au moins un linkId ou un téléphone",
    path: ["linkId"],
  });

type LinkValues = z.infer<typeof linkSchema>;
type UnlinkValues = z.infer<typeof unlinkSchema>;

export default function WalletOpsPage() {
  const { data: partners } = usePartners();
  const partnerOptions = React.useMemo(
    () =>
      (partners ?? []).filter(
        (p) =>
          p.code?.toUpperCase() !== WEB_PARTNER_CODE &&
          (p.status === PartnerStatus.Active || p.status === undefined),
      ),
    [partners],
  );

  const [partnerId, setPartnerId] = React.useState("");
  const hasKey = usePartnerStore((s) =>
    partnerId ? !!s.apiKeysByPartnerId[partnerId] : false,
  );

  React.useEffect(() => {
    if (!partnerId && partnerOptions.length === 1) {
      setPartnerId(partnerOptions[0].id);
    }
  }, [partnerId, partnerOptions]);

  const linkMutation = useWalletLink(partnerId);
  const unlinkMutation = useWalletUnlink(partnerId);

  const linkForm = useForm<LinkValues>({
    resolver: zodResolver(linkSchema),
    defaultValues: {
      phoneNumber: "",
      partnerRef: `LINK-${Date.now()}`,
      bankAccount: "",
    },
  });

  const unlinkForm = useForm<UnlinkValues>({
    resolver: zodResolver(unlinkSchema),
    defaultValues: { linkId: "", phoneNumber: "", partnerRef: "" },
  });

  async function onLink(values: LinkValues) {
    if (!partnerId || !hasKey) {
      toast.error(
        "Sélectionnez un partenaire et assurez-vous d'avoir sa clé API (rotation).",
      );
      return;
    }
    try {
      const result = await linkMutation.mutateAsync(values);
      toast.success(`Liaison OK — linkId: ${result.linkId ?? "—"}`);
      linkForm.setValue("partnerRef", `LINK-${Date.now()}`);
    } catch (e) {
      toast.error(resolveWalletErrorMessage(e));
    }
  }

  async function onUnlink(values: UnlinkValues) {
    if (!partnerId || !hasKey) {
      toast.error(
        "Sélectionnez un partenaire et assurez-vous d'avoir sa clé API (rotation).",
      );
      return;
    }
    try {
      const result = await unlinkMutation.mutateAsync({
        linkId: values.linkId?.trim() || null,
        phoneNumber: values.phoneNumber?.trim() || null,
        partnerRef: values.partnerRef?.trim() || `UNLINK-${Date.now()}`,
      });
      toast.success(`Déliaison OK — statut: ${result.status}`);
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? resolveWalletErrorMessage(e)
          : resolveWalletErrorMessage(e);
      toast.error(msg);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wallet"
        description="Lier ou délier un wallet et un compte bancaire via le connecteur partenaire (clé métier requise, pas WEB)."
      />

      <Card>
        <CardHeader>
          <CardTitle>Partenaire</CardTitle>
          <CardDescription>
            La clé API du partenaire (rotation) authentifie les appels
            /api/v1/wallet/*.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Select value={partnerId || undefined} onValueChange={setPartnerId}>
            <SelectTrigger className="max-w-md">
              <SelectValue placeholder="Choisir un partenaire…" />
            </SelectTrigger>
            <SelectContent>
              {partnerOptions.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {partnerId && !hasKey && (
            <p className="text-sm text-destructive">
              Clé API absente. Ouvrez Partenaires → détail → Rotate key, puis
              réessayez (la clé est mise en cache localement).
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-4 w-4" /> Lier
            </CardTitle>
            <CardDescription>POST /api/v1/wallet/link</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...linkForm}>
              <form
                className="space-y-4"
                onSubmit={linkForm.handleSubmit(onLink)}
              >
                <FormField
                  control={linkForm.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Téléphone wallet</FormLabel>
                      <FormControl>
                        <Input placeholder="+221771112233" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={linkForm.control}
                  name="bankAccount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Compte bancaire</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="SN012-0001-2345-6789"
                          className="font-mono text-xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={linkForm.control}
                  name="partnerRef"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PartnerRef (idempotence)</FormLabel>
                      <FormControl>
                        <Input className="font-mono text-xs" {...field} />
                      </FormControl>
                      <FormDescription>
                        Référence unique renvoyée dans partnerTransactionRef.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  disabled={!partnerId || !hasKey || linkMutation.isPending}
                >
                  {linkMutation.isPending && (
                    <Loader2 className="animate-spin" />
                  )}
                  Lier
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Unlink className="h-4 w-4" /> Délier
            </CardTitle>
            <CardDescription>POST /api/v1/wallet/unlink</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...unlinkForm}>
              <form
                className="space-y-4"
                onSubmit={unlinkForm.handleSubmit(onUnlink)}
              >
                <FormField
                  control={unlinkForm.control}
                  name="linkId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>LinkId</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="mock-wave-link-…"
                          className="font-mono text-xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={unlinkForm.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Téléphone (alternatif)</FormLabel>
                      <FormControl>
                        <Input placeholder="+221771112233" {...field} />
                      </FormControl>
                      <FormDescription>
                        Au moins linkId ou téléphone.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={unlinkForm.control}
                  name="partnerRef"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PartnerRef (optionnel)</FormLabel>
                      <FormControl>
                        <Input className="font-mono text-xs" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  variant="outline"
                  disabled={!partnerId || !hasKey || unlinkMutation.isPending}
                >
                  {unlinkMutation.isPending && (
                    <Loader2 className="animate-spin" />
                  )}
                  Délier
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
