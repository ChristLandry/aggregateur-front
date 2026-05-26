/**
 * Pure simulator for accounting schemas.
 *
 * Mirrors the Prompt B specification:
 *   1. Sort lines by lineOrder
 *   2. Skip conditional lines whose condition evaluates to false
 *   3. Resolve account (Fixed → accountCode, Dynamic → accountExpression)
 *   4. Evaluate amountFormula → raw, signed via Side
 *      (Debit = -|raw|, Credit = +|raw|)
 *   5. Bind L1..LN = |raw| for downstream lines
 *   6. Sum fees (IsFee lines) → FeeAmount ; NetAmount = AMOUNT - FeeAmount
 *   7. Balance = sum(signed amounts) ; must be 0 for the schema to be valid.
 */
import { AccountType, LedgerSide } from "@/lib/enums";
import type { AccountingLine, AccountingSchema } from "@/lib/api/types";
import {
  evaluateBoolean,
  evaluateFormula,
  evaluateNumber,
  FormulaError,
} from "./evaluator";

export interface SimulationContext {
  AMOUNT: number;
  currency?: string;
  PARTNER?: {
    Balance?: number;
    AccountCode?: string;
    Currency?: string;
  };
  CUSTOMER?: {
    PhoneNumber?: string;
    BankAccount?: string;
    Email?: string;
  };
  TX?: {
    Currency?: string;
    Type?: number;
  };
  /** Extra free-form vars merged into the eval context as-is. */
  extras?: Record<string, unknown>;
}

export interface SimulatedMovement {
  lineId?: string;
  lineOrder: number;
  account: string;
  side: LedgerSide;
  /** Signed amount (negative for debit, positive for credit). */
  amount: number;
  label?: string;
  code?: string;
  exploitant?: string;
  isFee: boolean;
  formula: string;
  /** Raw absolute amount (= |signed|) — handy for display. */
  rawAmount: number;
  skipped?: boolean;
  skipReason?: string;
}

export interface LineError {
  lineOrder: number;
  field: "amountFormula" | "condition" | "accountExpression";
  message: string;
}

export interface SimulationResult {
  movements: SimulatedMovement[];
  feeAmount: number;
  netAmount: number;
  totalDebit: number;
  totalCredit: number;
  balance: number;
  isBalanced: boolean;
  errors: LineError[];
}

const EPSILON = 0.005;

/**
 * Run the simulation for the given schema + context.
 * Never throws — collects per-line errors instead so the UI can show
 * which line broke and why.
 */
export function simulate(
  schema: Pick<AccountingSchema, "lines">,
  context: SimulationContext,
): SimulationResult {
  const sorted = [...(schema.lines ?? [])].sort(
    (a, b) => a.lineOrder - b.lineOrder,
  );

  const ctx: Record<string, unknown> = {
    AMOUNT: context.AMOUNT,
    AMOUNT_NET: context.AMOUNT,
    FEE: 0,
    PARTNER: context.PARTNER ?? {},
    CUSTOMER: context.CUSTOMER ?? {},
    TX: { Currency: context.currency, ...(context.TX ?? {}) },
    ...(context.extras ?? {}),
  };

  const movements: SimulatedMovement[] = [];
  const errors: LineError[] = [];
  let feeAmount = 0;

  for (const line of sorted) {
    // Conditional skip.
    if (line.isConditional) {
      try {
        const cond = evaluateBoolean(line.condition ?? "", ctx);
        if (!cond) {
          movements.push(buildSkipped(line, "Condition fausse"));
          // L{n} for skipped lines = 0 by convention.
          ctx[`L${line.lineOrder}`] = 0;
          continue;
        }
      } catch (err) {
        errors.push({
          lineOrder: line.lineOrder,
          field: "condition",
          message: err instanceof FormulaError ? err.message : String(err),
        });
        movements.push(buildSkipped(line, "Erreur condition"));
        ctx[`L${line.lineOrder}`] = 0;
        continue;
      }
    }

    // Resolve account.
    let account = "";
    if (line.accountType === AccountType.Dynamic && line.accountExpression) {
      try {
        const resolved = evaluateFormula(line.accountExpression, ctx);
        account = String(resolved ?? "");
      } catch (err) {
        errors.push({
          lineOrder: line.lineOrder,
          field: "accountExpression",
          message: err instanceof FormulaError ? err.message : String(err),
        });
      }
    } else {
      account = line.accountCode ?? "";
    }

    // Evaluate amount.
    let raw = 0;
    let formulaOk = true;
    try {
      raw = evaluateNumber(line.amountFormula, ctx);
    } catch (err) {
      formulaOk = false;
      errors.push({
        lineOrder: line.lineOrder,
        field: "amountFormula",
        message: err instanceof FormulaError ? err.message : String(err),
      });
    }

    const abs = formulaOk ? Math.abs(raw) : 0;
    const signed = line.side === LedgerSide.Debit ? -abs : abs;

    movements.push({
      lineId: line.id,
      lineOrder: line.lineOrder,
      account,
      side: line.side,
      amount: signed,
      label: line.label,
      code: line.code,
      exploitant: line.exploitant,
      isFee: line.isFee,
      formula: line.amountFormula,
      rawAmount: abs,
    });

    // Bind L{n} for next iterations.
    ctx[`L${line.lineOrder}`] = abs;

    if (line.isFee && formulaOk) feeAmount += abs;

    // Keep FEE / AMOUNT_NET up-to-date so later lines can reference them.
    ctx.FEE = feeAmount;
    ctx.AMOUNT_NET = context.AMOUNT - feeAmount;
  }

  const totalDebit = movements
    .filter((m) => m.side === LedgerSide.Debit && !m.skipped)
    .reduce((s, m) => s + m.rawAmount, 0);
  const totalCredit = movements
    .filter((m) => m.side === LedgerSide.Credit && !m.skipped)
    .reduce((s, m) => s + m.rawAmount, 0);
  const balance = movements.reduce((s, m) => s + (m.skipped ? 0 : m.amount), 0);
  const isBalanced = errors.length === 0 && Math.abs(balance) < EPSILON;
  const netAmount = context.AMOUNT - feeAmount;

  return {
    movements,
    feeAmount,
    netAmount,
    totalDebit,
    totalCredit,
    balance,
    isBalanced,
    errors,
  };
}

function buildSkipped(line: AccountingLine, reason: string): SimulatedMovement {
  return {
    lineId: line.id,
    lineOrder: line.lineOrder,
    account: line.accountCode ?? line.accountExpression ?? "",
    side: line.side,
    amount: 0,
    label: line.label,
    code: line.code,
    exploitant: line.exploitant,
    isFee: line.isFee,
    formula: line.amountFormula,
    rawAmount: 0,
    skipped: true,
    skipReason: reason,
  };
}
