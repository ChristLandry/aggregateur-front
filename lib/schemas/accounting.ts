import { z } from "zod";
import { AccountType, Channel, LedgerSide, TransactionType } from "@/lib/enums";

export const accountingLineSchema = z
  .object({
    lineOrder: z.coerce.number().int().min(1),
    accountType: z.nativeEnum(AccountType),
    accountCode: z.string().optional(),
    accountExpression: z.string().optional(),
    side: z.nativeEnum(LedgerSide),
    amountFormula: z.string().min(1, "Formule requise"),
    label: z.string().min(1, "Libellé requis"),
    code: z.string().optional(),
    exploitant: z.string().optional(),
    isFee: z.boolean().default(false),
    isConditional: z.boolean().default(false),
    condition: z.string().optional(),
  })
  .refine(
    (v) =>
      v.accountType === AccountType.Dynamic
        ? !!v.accountExpression?.trim()
        : !!v.accountCode?.trim(),
    { message: "Code ou expression requis selon le type", path: ["accountCode"] },
  )
  .refine((v) => !v.isConditional || !!v.condition?.trim(), {
    message: "Condition requise si IsConditional",
    path: ["condition"],
  });

export type AccountingLineFormValues = z.infer<typeof accountingLineSchema>;

export const accountingSchemaSchema = z.object({
  name: z.string().min(2, "Nom requis"),
  code: z.string().min(2, "Code requis"),
  transactionType: z.nativeEnum(TransactionType),
  channel: z.nativeEnum(Channel),
  isActive: z.boolean().default(true),
  description: z.string().optional(),
});

export type AccountingSchemaFormValues = z.infer<typeof accountingSchemaSchema>;
