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
import { partnerSchema, type PartnerFormValues } from "@/lib/schemas/partner";
import { dirtyValues } from "@/lib/utils";
import type { Partner } from "@/lib/api/types";
import { usePartnerAllowedCodes, usePartners } from "@/lib/api/partners";
import { WEB_PARTNER_CODE } from "@/lib/partner/constants";

interface PartnerFormProps {
  initial?: Partial<Partner>;
  /** Receives only dirty fields (partial PATCH). */
  onSubmit: (values: Partial<PartnerFormValues>) => Promise<void> | void;
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

  const codeOptions = React.useMemo(() => {
    return (allowedCodes ?? []).filter((code) => !existingCodes.has(code));
  }, [allowedCodes, existingCodes]);

  const form = useForm<PartnerFormValues>({
    resolver: zodResolver(partnerSchema),
    defaultValues: {
      code: initial?.code ?? "",
      name: initial?.name ?? "",
      baseUrl: initial?.baseUrl ?? "",
      accountCode: initial?.accountCode ?? "",
      currency: initial?.currency ?? "XOF",
      contactEmail: initial?.contactEmail ?? "",
      contactPhone: initial?.contactPhone ?? "",
    },
  });

  const submit = form.handleSubmit(async (values) => {
    const payload = initial?.id
      ? dirtyValues(form.formState.dirtyFields, values)
      : values;
    await onSubmit(payload);
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
                        {codeOptions.length === 0 && (
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
            {!initial?.id && (
              <FormField
                control={form.control}
                name="baseUrl"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>URL de base (API partenaire)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://localhost:44302" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
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
                    <Input placeholder="+225…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
