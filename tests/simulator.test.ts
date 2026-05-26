import { describe, expect, it } from "vitest";
import { simulate } from "@/lib/accounting/simulator";
import { SCENARIOS } from "@/lib/accounting/scenarios";
import { AccountType, LedgerSide } from "@/lib/enums";
import type { AccountingLine } from "@/lib/api/types";

function line(partial: Partial<AccountingLine> & Pick<AccountingLine, "lineOrder" | "side" | "amountFormula">): AccountingLine {
  return {
    id: `m-${partial.lineOrder}`,
    schemaId: "test",
    accountType: AccountType.Fixed,
    accountCode: "411",
    isFee: false,
    isConditional: false,
    ...partial,
  };
}

describe("simulate", () => {
  it("computes a simple balanced 2-line schema", () => {
    const result = simulate(
      {
        lines: [
          line({ lineOrder: 1, side: LedgerSide.Debit, amountFormula: "AMOUNT", accountCode: "411" }),
          line({ lineOrder: 2, side: LedgerSide.Credit, amountFormula: "AMOUNT", accountCode: "512" }),
        ],
      },
      { AMOUNT: 1000 },
    );
    expect(result.movements).toHaveLength(2);
    expect(result.movements[0].amount).toBe(-1000);
    expect(result.movements[1].amount).toBe(1000);
    expect(result.balance).toBe(0);
    expect(result.isBalanced).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("binds L1..LN for downstream lines", () => {
    const result = simulate(
      {
        lines: [
          line({ lineOrder: 1, side: LedgerSide.Debit, amountFormula: "AMOUNT" }),
          line({ lineOrder: 2, side: LedgerSide.Credit, amountFormula: "L1 * 0.1", isFee: true }),
          line({ lineOrder: 3, side: LedgerSide.Credit, amountFormula: "L1 - L2" }),
        ],
      },
      { AMOUNT: 1000 },
    );
    expect(result.movements.map((m) => m.amount)).toEqual([-1000, 100, 900]);
    expect(result.feeAmount).toBe(100);
    expect(result.netAmount).toBe(900);
    expect(result.balance).toBe(0);
    expect(result.isBalanced).toBe(true);
  });

  it("skips conditional lines whose condition is false", () => {
    const result = simulate(
      {
        lines: [
          line({ lineOrder: 1, side: LedgerSide.Debit, amountFormula: "AMOUNT" }),
          line({ lineOrder: 2, side: LedgerSide.Credit, amountFormula: "AMOUNT" }),
          line({
            lineOrder: 3,
            side: LedgerSide.Credit,
            amountFormula: "100",
            isConditional: true,
            condition: "AMOUNT > 5000",
          }),
        ],
      },
      { AMOUNT: 1000 },
    );
    expect(result.movements[2].skipped).toBe(true);
    expect(result.balance).toBe(0);
    expect(result.isBalanced).toBe(true);
  });

  it("activates conditional lines when condition is true", () => {
    const result = simulate(
      {
        lines: [
          line({ lineOrder: 1, side: LedgerSide.Debit, amountFormula: "AMOUNT" }),
          line({ lineOrder: 2, side: LedgerSide.Credit, amountFormula: "AMOUNT" }),
          line({
            lineOrder: 3,
            side: LedgerSide.Credit,
            amountFormula: "100",
            isConditional: true,
            condition: "AMOUNT > 5000",
          }),
          line({
            lineOrder: 4,
            side: LedgerSide.Debit,
            amountFormula: "L3",
            isConditional: true,
            condition: "AMOUNT > 5000",
          }),
        ],
      },
      { AMOUNT: 8000 },
    );
    expect(result.movements[2].skipped).toBeFalsy();
    expect(result.movements[2].amount).toBe(100);
    expect(result.movements[3].amount).toBe(-100);
    expect(result.isBalanced).toBe(true);
  });

  it("collects errors per line on invalid formula", () => {
    const result = simulate(
      {
        lines: [
          line({ lineOrder: 1, side: LedgerSide.Debit, amountFormula: "AMOUNT" }),
          line({ lineOrder: 2, side: LedgerSide.Credit, amountFormula: "AMOUNT *** 2" }),
        ],
      },
      { AMOUNT: 1000 },
    );
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].lineOrder).toBe(2);
    expect(result.errors[0].field).toBe("amountFormula");
    expect(result.isBalanced).toBe(false);
  });

  it("flags a schema as unbalanced when amounts don't match", () => {
    const result = simulate(
      {
        lines: [
          line({ lineOrder: 1, side: LedgerSide.Debit, amountFormula: "1000" }),
          line({ lineOrder: 2, side: LedgerSide.Credit, amountFormula: "500" }),
        ],
      },
      { AMOUNT: 0 },
    );
    expect(result.totalDebit).toBe(1000);
    expect(result.totalCredit).toBe(500);
    expect(result.balance).toBe(-500);
    expect(result.isBalanced).toBe(false);
  });

  it("accumulates multiple IsFee lines into feeAmount", () => {
    const result = simulate(
      {
        lines: [
          line({ lineOrder: 1, side: LedgerSide.Debit, amountFormula: "AMOUNT" }),
          line({ lineOrder: 2, side: LedgerSide.Credit, amountFormula: "100", isFee: true }),
          line({ lineOrder: 3, side: LedgerSide.Credit, amountFormula: "50", isFee: true }),
          line({ lineOrder: 4, side: LedgerSide.Credit, amountFormula: "AMOUNT - FEE" }),
        ],
      },
      { AMOUNT: 1000 },
    );
    expect(result.feeAmount).toBe(150);
    expect(result.netAmount).toBe(850);
    expect(result.movements[3].amount).toBe(850);
    expect(result.isBalanced).toBe(true);
  });

  it("resolves dynamic account expressions", () => {
    const result = simulate(
      {
        lines: [
          {
            id: "x",
            schemaId: "s",
            lineOrder: 1,
            accountType: AccountType.Dynamic,
            accountExpression: "PARTNER.AccountCode",
            side: LedgerSide.Debit,
            amountFormula: "AMOUNT",
            isFee: false,
            isConditional: false,
          },
        ],
      },
      { AMOUNT: 100, PARTNER: { AccountCode: "411999" } },
    );
    expect(result.movements[0].account).toBe("411999");
  });
});

describe("pre-built scenarios", () => {
  for (const s of SCENARIOS) {
    it(`${s.title} matches its expected output`, () => {
      const r = simulate({ lines: s.lines }, s.context);
      expect(r.errors).toHaveLength(0);
      expect(r.feeAmount).toBeCloseTo(s.expected.feeAmount, 2);
      expect(r.netAmount).toBeCloseTo(s.expected.netAmount, 2);
      expect(r.balance).toBeCloseTo(s.expected.balance, 2);
      expect(r.movements.length).toBe(s.expected.movementCount);
      expect(r.isBalanced).toBe(true);
    });
  }

  it("Wallet scenario with AMOUNT=3000 skips the conditional bonus", () => {
    const sc = SCENARIOS.find((s) => s.id === "wallet-conditional")!;
    const r = simulate({ lines: sc.lines }, { ...sc.context, AMOUNT: 3000 });
    const conditionalMovs = r.movements.filter((m) => m.lineOrder >= 3);
    expect(conditionalMovs.every((m) => m.skipped)).toBe(true);
    expect(r.isBalanced).toBe(true);
  });
});
