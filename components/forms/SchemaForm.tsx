"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { accountingSchemaSchema, type AccountingSchemaFormValues } from "@/lib/schemas/accounting";
import { dirtyValues } from "@/lib/utils";
import {
  Channel,
  TransactionType,
  TransactionTypeLabel,
} from "@/lib/enums";
import type { AccountingSchema } from "@/lib/api/types";

interface SchemaFormProps {
  initial?: Partial<AccountingSchema>;
  onSubmit: (values: Partial<AccountingSchemaFormValues>) => Promise<void> | void;
  submitLabel?: string;
  onCancel?: () => void;
  loading?: boolean;
}

export function SchemaForm({
  initial,
  onSubmit,
  submitLabel = "Enregistrer",
  onCancel,
  loading,
}: SchemaFormProps) {
  const form = useForm<AccountingSchemaFormValues>({
    resolver: zodResolver(accountingSchemaSchema),
    defaultValues: {
      name: initial?.name ?? "",
      code: initial?.code ?? "",
      transactionType: initial?.transactionType ?? TransactionType.BankDebit,
      channel: initial?.channel ?? Channel.Bank,
      isActive: initial?.isActive ?? true,
      description: initial?.description ?? "",
    },
  });

  const submit = form.handleSubmit(async (values) => {
    const payload = initial?.id ? dirtyValues(form.formState.dirtyFields, values) : values;
    await onSubmit(payload);
  });

  return (
    <Form {...form}>
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Code</FormLabel>
                <FormControl><Input placeholder="SCH_BD_001" {...field} /></FormControl>
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
                <FormControl><Input placeholder="Débit bancaire standard" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="transactionType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type de transaction</FormLabel>
                <Select
                  value={String(field.value ?? TransactionType.BankDebit)}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {Object.values(TransactionType)
                      .filter((v): v is TransactionType => typeof v === "number")
                      .map((t) => (
                        <SelectItem key={t} value={String(t)}>
                          {TransactionTypeLabel[t]}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="channel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Canal</FormLabel>
                <Select
                  value={String(field.value ?? Channel.Bank)}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value={String(Channel.Bank)}>Bank</SelectItem>
                    <SelectItem value={String(Channel.Wallet)}>Wallet</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl><Textarea rows={3} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <FormLabel>Actif</FormLabel>
                <FormDescription>
                  Schéma utilisé pour générer les mouvements.
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Annuler
            </Button>
          )}
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
