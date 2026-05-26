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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { customerSchema, type CustomerFormValues } from "@/lib/schemas/customer";
import { dirtyValues } from "@/lib/utils";
import { CustomerStatus, CustomerStatusLabel, KycStatus, KycStatusLabel } from "@/lib/enums";
import type { Customer } from "@/lib/api/types";

interface CustomerFormProps {
  initial?: Partial<Customer>;
  onSubmit: (values: Partial<CustomerFormValues>) => Promise<void> | void;
  submitLabel?: string;
  onCancel?: () => void;
  loading?: boolean;
}

export function CustomerForm({
  initial,
  onSubmit,
  submitLabel = "Enregistrer",
  onCancel,
  loading,
}: CustomerFormProps) {
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      externalId: initial?.externalId ?? "",
      firstName: initial?.firstName ?? "",
      lastName: initial?.lastName ?? "",
      dateOfBirth: initial?.dateOfBirth ?? "1990-01-01",
      nationalId: "",
      email: initial?.email ?? "",
      status: initial?.status ?? CustomerStatus.Active,
      kycStatus: initial?.kycStatus ?? KycStatus.NotVerified,
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
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prénom</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nom</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dateOfBirth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date de naissance</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="nationalId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pièce d&apos;identité</FormLabel>
                <FormControl>
                  <Input placeholder="CI-0123-7896" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl><Input type="email" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="externalId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Identifiant externe</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Statut</FormLabel>
                <Select
                  value={String(field.value ?? CustomerStatus.Active)}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.values(CustomerStatus)
                      .filter((v): v is CustomerStatus => typeof v === "number")
                      .map((s) => (
                        <SelectItem key={s} value={String(s)}>
                          {CustomerStatusLabel[s]}
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
            name="kycStatus"
            render={({ field }) => (
              <FormItem>
                <FormLabel>KYC</FormLabel>
                <Select
                  value={String(field.value ?? KycStatus.NotVerified)}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.values(KycStatus)
                      .filter((v): v is KycStatus => typeof v === "number")
                      .map((s) => (
                        <SelectItem key={s} value={String(s)}>
                          {KycStatusLabel[s]}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
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
          <Button type="button" variant="secondary" onClick={() => form.reset()} disabled={loading}>
            Réinitialiser
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
