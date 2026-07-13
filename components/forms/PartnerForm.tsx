"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  partnerSchema,
  type PartnerFormValues,
  type PartnerSubmitValues,
} from "@/lib/schemas/partner";
import { dirtyValues, formatCurrency } from "@/lib/utils";
import type { Partner } from "@/lib/api/types";
import { usePartnerAllowedCodes, usePartners } from "@/lib/api/partners";
import { WEB_PARTNER_CODE } from "@/lib/partner/constants";
import {
  alertChannelsLabel,
  decodeAlertChannels,
  encodeAlertChannels,
} from "@/lib/enums";

function partnerAlertsActive(p?: Partial<Partner> | null): boolean {
  if (!p) return false;
  return (
    p.lowBalanceThresholdPercent != null ||
    p.lowBalanceReferenceAmount != null ||
    p.alertChannels != null
  );
}

function toFormDefaults(initial?: Partial<Partner>): PartnerFormValues {
  const channels = decodeAlertChannels(initial?.alertChannels);
  const enabled = partnerAlertsActive(initial);
  return {
    code: initial?.code ?? "",
    name: initial?.name ?? "",
    baseUrl: initial?.baseUrl ?? "",
    accountCode: initial?.accountCode ?? "",
    currency: initial?.currency ?? "XOF",
    webhookUrl: initial?.webhookUrl ?? "",
    contactEmail: initial?.contactEmail ?? "",
    contactPhone: initial?.contactPhone ?? "",
    alertsEnabled: enabled,
    lowBalanceThresholdPercent: initial?.lowBalanceThresholdPercent ?? 20,
    lowBalanceReferenceAmount: initial?.lowBalanceReferenceAmount ?? null,
    alertEmail: channels.email,
    alertSms: channels.sms,
  };
}

interface PartnerFormProps {
  initial?: Partial<Partner>;
  /** Receives only dirty fields (partial PATCH) côté API. */
  onSubmit: (values: PartnerSubmitValues) => Promise<void> | void;
  submitLabel?: string;
  onCancel?: () => void;
  loading?: boolean;
}

export function PartnerForm({
  initial,
  onSubmit,
  submitLabel = "Enregistrer",
  onCancel,
  loading,
}: PartnerFormProps) {
  const isCreate = !initial?.id;
  const { data: allowedCodes, refetch, isFetching: codesLoading } =
    usePartnerAllowedCodes(isCreate);
  const { data: existingPartners } = usePartners();

  const existingCodes = React.useMemo(
    () => new Set((existingPartners ?? []).map((p) => p.code)),
    [existingPartners],
  );

  const form = useForm<PartnerFormValues>({
    resolver: zodResolver(partnerSchema),
    defaultValues: toFormDefaults(initial),
  });

  React.useEffect(() => {
    if (!initial?.id) return;
    form.reset(toFormDefaults(initial));
  }, [
    form,
    initial?.id,
    initial?.code,
    initial?.name,
    initial?.baseUrl,
    initial?.accountCode,
    initial?.currency,
    initial?.webhookUrl,
    initial?.contactEmail,
    initial?.contactPhone,
    initial?.lowBalanceThresholdPercent,
    initial?.lowBalanceReferenceAmount,
    initial?.alertChannels,
    initial?.updatedAt,
  ]);

  const alertsEnabled = useWatch({ control: form.control, name: "alertsEnabled" });
  const threshold = useWatch({
    control: form.control,
    name: "lowBalanceThresholdPercent",
  });
  const reference = useWatch({
    control: form.control,
    name: "lowBalanceReferenceAmount",
  });
  const currency = useWatch({ control: form.control, name: "currency" }) || "XOF";
  const alertEmail = useWatch({ control: form.control, name: "alertEmail" });
  const alertSms = useWatch({ control: form.control, name: "alertSms" });

  const alertPreview =
    alertsEnabled &&
    threshold != null &&
    threshold > 0 &&
    reference != null &&
    reference > 0
      ? (reference * threshold) / 100
      : null;

  const submit = form.handleSubmit(async (values) => {
    const dirty = isCreate
      ? null
      : dirtyValues(
          form.formState.dirtyFields as Partial<
            Record<keyof PartnerFormValues, boolean | object>
          >,
          values,
        );

    const alertDirty =
      isCreate ||
      !!(
        form.formState.dirtyFields.alertsEnabled ||
        form.formState.dirtyFields.lowBalanceThresholdPercent ||
        form.formState.dirtyFields.lowBalanceReferenceAmount ||
        form.formState.dirtyFields.alertEmail ||
        form.formState.dirtyFields.alertSms
      );

    const alertPayload: Pick<
      PartnerSubmitValues,
      | "lowBalanceThresholdPercent"
      | "lowBalanceReferenceAmount"
      | "alertChannels"
    > = !values.alertsEnabled
      ? {
          lowBalanceThresholdPercent: null,
          lowBalanceReferenceAmount: null,
          alertChannels: null,
        }
      : {
          lowBalanceThresholdPercent: values.lowBalanceThresholdPercent ?? null,
          lowBalanceReferenceAmount: values.lowBalanceReferenceAmount ?? null,
          alertChannels: encodeAlertChannels(values.alertEmail, values.alertSms),
        };

    const base: PartnerSubmitValues = {};
    if (isCreate) {
      base.code = values.code;
      base.name = values.name;
      base.baseUrl = values.baseUrl;
      base.accountCode = values.accountCode;
      base.currency = values.currency;
      base.webhookUrl = values.webhookUrl;
      base.contactEmail = values.contactEmail;
      base.contactPhone = values.contactPhone;
      Object.assign(base, alertPayload);
    } else if (dirty) {
      if (dirty.code !== undefined) base.code = dirty.code as string;
      if (dirty.name !== undefined) base.name = dirty.name as string;
      if (dirty.baseUrl !== undefined) base.baseUrl = dirty.baseUrl as string;
      if (dirty.accountCode !== undefined)
        base.accountCode = dirty.accountCode as string;
      if (dirty.currency !== undefined) base.currency = dirty.currency as string;
      if (dirty.webhookUrl !== undefined)
        base.webhookUrl = dirty.webhookUrl as string;
      if (dirty.contactEmail !== undefined)
        base.contactEmail = dirty.contactEmail as string;
      if (dirty.contactPhone !== undefined)
        base.contactPhone = dirty.contactPhone as string;
      if (alertDirty) Object.assign(base, alertPayload);
    }

    await onSubmit(base);
  });

  return (
    <TooltipProvider delayDuration={200}>
      <Form {...form}>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between gap-2">
                    <FormLabel>Code partenaire</FormLabel>
                    {isCreate && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        disabled={codesLoading}
                        onClick={() => refetch()}
                      >
                        {codesLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                        <span className="sr-only">Rafraîchir les codes</span>
                      </Button>
                    )}
                  </div>
                  {isCreate ? (
                    <Select
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                      disabled={codesLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choisir un code…" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {codeOptionsEmpty(existingCodes, allowedCodes) && (
                          <SelectItem value="__empty__" disabled>
                            Aucun code disponible
                          </SelectItem>
                        )}
                        {(allowedCodes ?? []).map((code) => {
                          const taken = existingCodes.has(code);
                          const isWeb = code === WEB_PARTNER_CODE;
                          if (taken && !isWeb) return null;

                          if (isWeb) {
                            return (
                              <Tooltip key={code}>
                                <TooltipTrigger asChild>
                                  <div>
                                    <SelectItem value={code} disabled>
                                      {code}
                                    </SelectItem>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Réservé à l&apos;application web (auto-seedé)
                                </TooltipContent>
                              </Tooltip>
                            );
                          }

                          if (taken) return null;

                          return (
                            <SelectItem key={code} value={code}>
                              {code}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  ) : (
                    <FormControl>
                      <Input readOnly className="font-mono" {...field} />
                    </FormControl>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom</FormLabel>
                  <FormControl>
                    <Input placeholder="MTN Côte d'Ivoire" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="baseUrl"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>URL de base (API partenaire)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://api.partenaire.example/"
                      className="font-mono text-xs"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="accountCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Compte miroir</FormLabel>
                  <FormControl>
                    <Input placeholder="411001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Devise</FormLabel>
                  <FormControl>
                    <Input maxLength={3} placeholder="XOF" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email contact</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="ops@partner.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Téléphone</FormLabel>
                  <FormControl>
                    <Input placeholder="+22507000000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="webhookUrl"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Webhook URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://…"
                      className="font-mono text-xs"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4 rounded-md border border-border p-4">
            <FormField
              control={form.control}
              name="alertsEnabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-4 space-y-0">
                  <div>
                    <FormLabel className="text-base">Alerte de solde bas</FormLabel>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Notification quand le solde passe sous le seuil configuré.
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(on) => {
                        field.onChange(on);
                        if (on) {
                          const pct = form.getValues("lowBalanceThresholdPercent");
                          if (pct == null) {
                            form.setValue("lowBalanceThresholdPercent", 20, {
                              shouldDirty: true,
                            });
                          }
                        }
                      }}
                      aria-label="Activer les alertes"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {alertsEnabled && (
              <div className="grid gap-4 sm:grid-cols-2 border-t border-border pt-4">
                <FormField
                  control={form.control}
                  name="lowBalanceThresholdPercent"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Seuil (% du montant de référence)</FormLabel>
                      <div className="flex items-center gap-3">
                        <FormControl>
                          <input
                            type="range"
                            min={1}
                            max={100}
                            className="h-2 w-full accent-foreground"
                            value={field.value ?? 20}
                            onChange={(e) =>
                              field.onChange(Number(e.target.value))
                            }
                          />
                        </FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          className="w-20"
                          value={field.value ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            field.onChange(v === "" ? null : Number(v));
                          }}
                        />
                        <span className="text-sm text-muted-foreground shrink-0">
                          %
                        </span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lowBalanceReferenceAmount"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Montant de référence (100 %)</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input
                            type="number"
                            min={0.01}
                            step="0.01"
                            placeholder="5000000"
                            className="pr-14"
                            value={field.value ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              field.onChange(v === "" ? null : Number(v));
                            }}
                          />
                        </FormControl>
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">
                          {currency.toUpperCase()}
                        </span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="sm:col-span-2 space-y-2">
                  <Label>Canaux d&apos;envoi</Label>
                  <div className="flex flex-wrap gap-4">
                    <FormField
                      control={form.control}
                      name="alertEmail"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center gap-2 space-y-0">
                          <FormControl>
                            <input
                              type="checkbox"
                              className="size-4 rounded border-border"
                              checked={field.value}
                              onChange={(e) => field.onChange(e.target.checked)}
                            />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">
                            Email
                          </FormLabel>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="alertSms"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center gap-2 space-y-0">
                          <FormControl>
                            <input
                              type="checkbox"
                              className="size-4 rounded border-border"
                              checked={field.value}
                              onChange={(e) => field.onChange(e.target.checked)}
                            />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">
                            SMS
                          </FormLabel>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Canaux :{" "}
                    <span className="font-medium text-foreground">
                      {alertChannelsLabel(
                        encodeAlertChannels(!!alertEmail, !!alertSms),
                      )}
                    </span>
                  </p>
                </div>
                {alertPreview != null && (
                  <p className="sm:col-span-2 text-sm text-muted-foreground rounded-md bg-muted/50 px-3 py-2">
                    Alerte envoyée quand solde ≤{" "}
                    <strong className="text-foreground">{threshold} %</strong> de{" "}
                    <strong className="text-foreground">
                      {formatCurrency(reference!, currency)}
                    </strong>{" "}
                    ={" "}
                    <strong className="text-foreground">
                      {formatCurrency(alertPreview, currency)}
                    </strong>
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            {onCancel && (
              <Button type="button" variant="ghost" onClick={onCancel}>
                Annuler
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={() => form.reset()}
              disabled={loading}
            >
              Réinitialiser
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />}
              {submitLabel}
            </Button>
          </div>
        </form>
      </Form>
    </TooltipProvider>
  );
}

function codeOptionsEmpty(
  existing: Set<string>,
  allowed?: string[],
): boolean {
  if (!allowed?.length) return true;
  return allowed.every(
    (code) => existing.has(code) && code !== WEB_PARTNER_CODE,
  );
}
