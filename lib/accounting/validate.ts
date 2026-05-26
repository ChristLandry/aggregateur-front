import { accountingLineSchema } from "@/lib/schemas/accounting";
import type { AccountingLine, AccountingSchema } from "@/lib/api/types";

export interface SchemaValidationIssue {
  lineOrder?: number;
  path: string;
  message: string;
}

/**
 * Valide un schéma avant simulation (lignes ordonnées, formules, comptes).
 */
export function validateSchemaForSimulation(
  schema: Pick<AccountingSchema, "lines" | "name">,
): SchemaValidationIssue[] {
  const issues: SchemaValidationIssue[] = [];
  const lines = schema.lines ?? [];

  if (lines.length === 0) {
    issues.push({ path: "lines", message: "Le schéma ne contient aucune ligne." });
    return issues;
  }

  const orders = lines.map((l) => l.lineOrder);
  const dupOrders = orders.filter((o, i) => orders.indexOf(o) !== i);
  if (dupOrders.length > 0) {
    issues.push({
      path: "lineOrder",
      message: `Numéros d'ordre en double : ${[...new Set(dupOrders)].join(", ")}`,
    });
  }

  const sorted = [...lines].sort((a, b) => a.lineOrder - b.lineOrder);
  for (const line of sorted) {
    const parsed = accountingLineSchema.safeParse({
      lineOrder: line.lineOrder,
      accountType: line.accountType,
      accountCode: line.accountCode,
      accountExpression: line.accountExpression,
      side: line.side,
      amountFormula: line.amountFormula,
      label: line.label,
      code: line.code,
      exploitant: line.exploitant,
      isFee: line.isFee,
      isConditional: line.isConditional,
      condition: line.condition,
    });
    if (!parsed.success) {
      for (const err of parsed.error.errors) {
        issues.push({
          lineOrder: line.lineOrder,
          path: err.path.join("."),
          message: err.message,
        });
      }
    }
  }

  return issues;
}
