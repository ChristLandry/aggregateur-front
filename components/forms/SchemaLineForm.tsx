"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
import { accountingLineSchema, type AccountingLineFormValues } from "@/lib/schemas/accounting";
import { AccountType, LedgerSide } from "@/lib/enums";
import { ApiError } from "@/lib/api/client";
import type { AccountingLine } from "@/lib/api/types";
import {
  findLineOrderConflict,
  lineOrderConflictMessage,
  nextFreeLineOrder,
} from "@/lib/accounting/line-order";

interface SchemaLineFormProps {
  onSubmit: (values: AccountingLineFormValues) => Promise<void> | void;
  onCancel?: () => void;
  loading?: boolean;
  /** Prefill création : prochain ordre libre. */
  initialOrder?: number;
  initial?: Partial<AccountingLineFormValues>;
  submitLabel?: string;
  /** Lignes déjà présentes (validation unicité LineOrder). */
  existingLines?: Pick<AccountingLine, "id" | "lineOrder" | "label">[];
  /** En édition : autoriser de garder son propre ordre. */
  excludeLineId?: string | null;
}

export function SchemaLineForm({
  onSubmit,
  onCancel,
  loading,
  initialOrder = 1,
  initial,
  submitLabel = "Ajouter la ligne",
  existingLines = [],
  excludeLineId,
}: SchemaLineFormProps) {
  const lineOrderInputRef = React.useRef<HTMLInputElement | null>(null);

  const form = useForm<AccountingLineFormValues>({
    resolver: zodResolver(accountingLineSchema),
    defaultValues: {
      lineOrder: initial?.lineOrder ?? initialOrder,
      accountType: initial?.accountType ?? AccountType.Fixed,
      accountCode: initial?.accountCode ?? "",
      accountExpression: initial?.accountExpression ?? "",
      side: initial?.side ?? LedgerSide.Debit,
      amountFormula: initial?.amountFormula ?? "AMOUNT",
      label: initial?.label ?? "",
      code: initial?.code ?? "",
      exploitant: initial?.exploitant ?? "",
      isFee: initial?.isFee ?? false,
      isConditional: initial?.isConditional ?? false,
      condition: initial?.condition ?? "",
    },
  });

  const accountType = form.watch("accountType");
  const isConditional = form.watch("isConditional");
  const watchedOrder = Number(form.watch("lineOrder"));

  const conflict = React.useMemo(
    () =>
      Number.isFinite(watchedOrder) && watchedOrder >= 1
        ? findLineOrderConflict(existingLines, watchedOrder, excludeLineId)
        : undefined,
    [existingLines, watchedOrder, excludeLineId],
  );

  const conflictMessage = conflict
    ? lineOrderConflictMessage(watchedOrder, conflict.label)
    : null;

  async function handleSubmit(values: AccountingLineFormValues) {
    const localConflict = findLineOrderConflict(
      existingLines,
      values.lineOrder,
      excludeLineId,
    );
    if (localConflict) {
      const msg = lineOrderConflictMessage(values.lineOrder, localConflict.label);
      form.setError("lineOrder", { type: "manual", message: msg });
      lineOrderInputRef.current?.focus();
      return;
    }

    try {
      await onSubmit(values);
    } catch (e) {
      if (e instanceof ApiError && e.code === "LINE_ORDER_DUPLICATE") {
        const suggested = nextFreeLineOrder(existingLines);
        const msg =
          e.message ||
          lineOrderConflictMessage(values.lineOrder, undefined);
        toast.error(msg);
        form.setError("lineOrder", {
          type: "server",
          message: `${msg} Prochain ordre libre : ${suggested}.`,
        });
        form.setValue("lineOrder", suggested, { shouldValidate: true });
        requestAnimationFrame(() => lineOrderInputRef.current?.focus());
        return;
      }
      // onError de la mutation a déjà notifié — ne pas remonter d'AxiosError brut.
    }
  }

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="lineOrder"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ordre</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    {...field}
                    ref={(el) => {
                      field.ref(el);
                      lineOrderInputRef.current = el;
                    }}
                    onChange={(e) => {
                      field.onChange(e);
                      form.clearErrors("lineOrder");
                    }}
                  />
                </FormControl>
                {conflictMessage ? (
                  <p className="text-sm font-medium text-destructive">
                    {conflictMessage}
                  </p>
                ) : (
                  <FormMessage />
                )}
                <FormDescription>
                  Doit être unique dans le schéma. Prochain libre :{" "}
                  {nextFreeLineOrder(
                    existingLines.filter((l) => l.id !== excludeLineId),
                  )}
                </FormDescription>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="side"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Côté</FormLabel>
                <Select
                  value={String(field.value ?? LedgerSide.Debit)}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value={String(LedgerSide.Debit)}>Débit</SelectItem>
                    <SelectItem value={String(LedgerSide.Credit)}>Crédit</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="accountType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type compte</FormLabel>
                <Select
                  value={String(field.value ?? AccountType.Fixed)}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value={String(AccountType.Fixed)}>Fixe</SelectItem>
                    <SelectItem value={String(AccountType.Dynamic)}>Dynamique</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {accountType === AccountType.Fixed ? (
          <FormField
            control={form.control}
            name="accountCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Code compte</FormLabel>
                <FormControl><Input placeholder="411001" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <FormField
            control={form.control}
            name="accountExpression"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expression compte</FormLabel>
                <FormControl><Input placeholder="PARTNER.AccountCode" {...field} /></FormControl>
                <FormDescription>
                  Ex. <code>PARTNER.AccountCode</code> ou <code>&quot;411&quot; + CUSTOMER.PhoneNumber</code>
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="amountFormula"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Formule de montant</FormLabel>
              <FormControl><Input className="font-mono" placeholder="AMOUNT * 0.05" {...field} /></FormControl>
              <FormDescription>
                Variables: AMOUNT, FEE, AMOUNT_NET, PARTNER.Balance, L1, L2…
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="label"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Libellé</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Code</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="exploitant"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Exploitant</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="isFee"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-md border border-border p-3">
                <FormLabel>Est un frais</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isConditional"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-md border border-border p-3">
                <FormLabel>Conditionnelle</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {isConditional && (
          <FormField
            control={form.control}
            name="condition"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Condition</FormLabel>
                <FormControl><Input className="font-mono" placeholder="AMOUNT > 5000" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Annuler
            </Button>
          )}
          <Button type="submit" disabled={loading || !!conflict}>
            {loading && <Loader2 className="animate-spin" />}
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
