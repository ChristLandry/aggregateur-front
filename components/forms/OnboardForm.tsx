"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { onboardSchema, type OnboardFormValues } from "@/lib/schemas/onboard";
import { usePartnerAllowedCodes, usePartners } from "@/lib/api/partners";
import { WEB_PARTNER_CODE } from "@/lib/partner/constants";
import { PartnerStatus } from "@/lib/enums";
import type { Partner } from "@/lib/api/types";

interface OnboardFormProps {
  onSubmit: (values: OnboardFormValues) => Promise<void> | void;
  onCancel?: () => void;
  loading?: boolean;
  submitLabel?: string;
}

function isWebPartner(p: Partner): boolean {
  return p.code?.toUpperCase() === WEB_PARTNER_CODE;
}

/**
 * Options partenaire pour l'onboarding :
 * - base = partenaires créés (GET /partners), hors WEB
 * - si allowed-codes dispo, on privilégie l'intersection (insensible à la casse)
 * - si l'intersection est vide, on retombe sur toute la liste (évite combobox vide)
 */
function buildPartnerOptions(
  partners: Partner[] | undefined,
  allowedCodes: string[] | undefined,
): Partner[] {
  const created = (partners ?? []).filter((p) => !!p.id && !isWebPartner(p));
  if (created.length === 0) return [];

  const codes = (allowedCodes ?? [])
    .filter((c) => c.toUpperCase() !== WEB_PARTNER_CODE)
    .map((c) => c.toUpperCase());

  if (codes.length === 0) {
    return created.filter(
      (p) => p.status === PartnerStatus.Active || p.status === undefined,
    );
  }

  const codeSet = new Set(codes);
  const matched = created.filter((p) => codeSet.has((p.code ?? "").toUpperCase()));
  const pool = matched.length > 0 ? matched : created;

  const active = pool.filter((p) => p.status === PartnerStatus.Active);
  return active.length > 0 ? active : pool;
}

export function OnboardForm({
  onSubmit,
  onCancel,
  loading,
  submitLabel = "Lancer l'onboarding",
}: OnboardFormProps) {
  const {
    data: allowedCodes,
    refetch: refetchCodes,
    isFetching: codesFetching,
    isError: codesError,
  } = usePartnerAllowedCodes();
  const {
    data: partners,
    refetch: refetchPartners,
    isLoading: partnersLoading,
    isFetching: partnersFetching,
    isError: partnersError,
    error: partnersErr,
  } = usePartners();

  const partnerOptions = React.useMemo(
    () => buildPartnerOptions(partners, allowedCodes),
    [allowedCodes, partners],
  );

  const refreshing = codesFetching || partnersFetching;
  const loadingList = partnersLoading && !partners;

  const form = useForm<OnboardFormValues>({
    resolver: zodResolver(onboardSchema),
    defaultValues: {
      bankAccount: "",
      phoneNumber: "",
      bankAccountRoot: "",
      walletTemporalyCode: "",
      partnerId: "",
    },
  });

  async function refreshAll() {
    await Promise.all([refetchCodes(), refetchPartners()]);
  }

  return (
    <Form {...form}>
      <form
        className="space-y-5"
        onSubmit={form.handleSubmit(async (values) => {
          await onSubmit(values);
        })}
      >
        <FormField
          control={form.control}
          name="partnerId"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between gap-2">
                <FormLabel>Partenaire</FormLabel>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  disabled={refreshing}
                  onClick={() => refreshAll()}
                >
                  {refreshing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  <span className="sr-only">Rafraîchir</span>
                </Button>
              </div>
              <Select
                value={field.value || undefined}
                onValueChange={field.onChange}
                disabled={loadingList || partnerOptions.length === 0}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        loadingList
                          ? "Chargement des partenaires…"
                          : "Choisir un partenaire…"
                      }
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {partnerOptions.length === 0 ? (
                    <SelectItem value="__empty__" disabled>
                      Aucun partenaire disponible
                    </SelectItem>
                  ) : (
                    partnerOptions.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.code} — {p.name}
                        {p.status !== PartnerStatus.Active ? " (inactif)" : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormDescription>
                Partenaires créés (hors WEB), filtrés via allowed-codes quand
                disponibles.
              </FormDescription>
              {(partnersError || codesError || partnerOptions.length === 0) && (
                <p className="text-xs text-destructive">
                  {partnersError
                    ? `Impossible de charger GET /partners${
                        partnersErr instanceof Error
                          ? ` — ${partnersErr.message}`
                          : ""
                      }. Vérifiez le rôle Admin/Finance.`
                    : partnerOptions.length === 0
                      ? "Aucun partenaire métier en base. Créez-en un depuis Partenaires (ex. WAVE, MTN_MOMO)."
                      : null}
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bankAccount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Compte bancaire</FormLabel>
              <FormControl>
                <Input
                  placeholder="08584110023"
                  className="font-mono text-xs"
                  maxLength={50}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bankAccountRoot"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Racine client (bankAccountRoot)</FormLabel>
              <FormControl>
                <Input
                  placeholder="SN012-CLIENT-42"
                  className="font-mono text-xs"
                  maxLength={50}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Identifiant racine : un même root regroupe plusieurs Customers
                (un par partenaire).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Téléphone</FormLabel>
              <FormControl>
                <Input placeholder="774855680" maxLength={20} {...field} />
              </FormControl>
              <FormDescription>
                Numéro wallet (sans espaces). Pour WAVE, c&apos;est l&apos;alias
                MSISDN envoyé au connecteur.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="walletTemporalyCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Code OTP wallet</FormLabel>
              <FormControl>
                <Input
                  placeholder="1234"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={100}
                  className="font-mono tracking-widest"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Code temporaire 4–8 chiffres (selon le partenaire).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Annuler
            </Button>
          )}
          <Button type="submit" disabled={loading || partnerOptions.length === 0}>
            {loading && <Loader2 className="animate-spin" />}
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
