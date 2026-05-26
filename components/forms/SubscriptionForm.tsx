"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  subscriptionSchema,
  type SubscriptionFormValues,
} from "@/lib/schemas/subscription";

interface SubscriptionFormProps {
  defaultCustomerId?: string;
  lockCustomerId?: boolean;
  onSubmit: (values: SubscriptionFormValues) => Promise<void> | void;
  onCancel?: () => void;
  loading?: boolean;
  submitLabel?: string;
}

export function SubscriptionForm({
  defaultCustomerId = "",
  lockCustomerId = false,
  onSubmit,
  onCancel,
  loading,
  submitLabel = "Créer",
}: SubscriptionFormProps) {
  const form = useForm<SubscriptionFormValues>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: {
      customerId: defaultCustomerId,
      bankAccountNumber: "",
      bankCode: "WAVE",
      phoneNumber: "",
      phoneOperator: "WAVE",
      expiresAt: null,
    },
  });

  return (
    <Form {...form}>
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit(async (values) => {
          await onSubmit({
            ...values,
            expiresAt: values.expiresAt || null,
          });
        })}
      >
        <FormField
          control={form.control}
          name="customerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ID client</FormLabel>
              <FormControl>
                <Input
                  placeholder="UUID client"
                  disabled={lockCustomerId}
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
          name="bankAccountNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Compte bancaire</FormLabel>
              <FormControl>
                <Input placeholder="08584110023" className="font-mono text-xs" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="bankCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Code banque</FormLabel>
                <FormControl><Input placeholder="WAVE" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phoneOperator"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Opérateur</FormLabel>
                <FormControl><Input placeholder="WAVE" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Téléphone</FormLabel>
              <FormControl><Input placeholder="0748556806" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="expiresAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date d&apos;expiration (optionnel)</FormLabel>
              <FormControl>
                <Input
                  type="datetime-local"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                />
              </FormControl>
              <FormMessage />
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
