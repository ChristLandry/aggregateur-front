import { describe, expect, it } from "vitest";
import {
  evaluateBoolean,
  evaluateFormula,
  evaluateNumber,
  flattenContext,
  normalizeFormula,
  FormulaError,
} from "@/lib/accounting/evaluator";

describe("normalizeFormula", () => {
  it("rewrites dotted identifiers to underscored", () => {
    expect(normalizeFormula("PARTNER.Balance + AMOUNT")).toBe(
      "PARTNER_Balance + AMOUNT",
    );
  });

  it("rewrites IF(...) to _if(...)", () => {
    expect(normalizeFormula("IF(AMOUNT > 100, 10, 0)")).toBe(
      "_if(AMOUNT > 100, 10, 0)",
    );
  });

  it("rewrites <> to !=", () => {
    expect(normalizeFormula("AMOUNT <> 0")).toBe("AMOUNT != 0");
  });

  it("converts bare = to == without touching == or >=", () => {
    expect(normalizeFormula("AMOUNT = 100")).toBe("AMOUNT == 100");
    expect(normalizeFormula("AMOUNT == 100")).toBe("AMOUNT == 100");
    expect(normalizeFormula("AMOUNT >= 100")).toBe("AMOUNT >= 100");
  });

  it("lowercases function names", () => {
    expect(normalizeFormula("ROUND(AMOUNT * 1.5, 2)")).toBe(
      "round(AMOUNT * 1.5, 2)",
    );
    expect(normalizeFormula("CEILING(AMOUNT)")).toBe("ceil(AMOUNT)");
  });
});

describe("flattenContext", () => {
  it("flattens nested objects with underscore separator", () => {
    const out = flattenContext({
      PARTNER: { Balance: 5, AccountCode: "411" },
      AMOUNT: 100,
    });
    expect(out.PARTNER_Balance).toBe(5);
    expect(out.PARTNER_AccountCode).toBe("411");
    expect(out.AMOUNT).toBe(100);
  });
});

describe("evaluateNumber", () => {
  it("evaluates basic arithmetic", () => {
    expect(evaluateNumber("AMOUNT * 0.05", { AMOUNT: 1000 })).toBe(50);
  });

  it("supports dotted variables", () => {
    expect(
      evaluateNumber("PARTNER.Balance - AMOUNT", {
        PARTNER: { Balance: 5000 },
        AMOUNT: 1000,
      }),
    ).toBe(4000);
  });

  it("supports L1..LN references", () => {
    expect(
      evaluateNumber("L1 - L2", { L1: 1000, L2: 50, AMOUNT: 1000 }),
    ).toBe(950);
  });

  it("supports IF() ternary", () => {
    expect(
      evaluateNumber("IF(AMOUNT > 500, 100, 0)", { AMOUNT: 1000 }),
    ).toBe(100);
    expect(
      evaluateNumber("IF(AMOUNT > 500, 100, 0)", { AMOUNT: 100 }),
    ).toBe(0);
  });

  it("supports MIN/MAX/ROUND", () => {
    expect(evaluateNumber("MIN(AMOUNT, 500)", { AMOUNT: 1000 })).toBe(500);
    expect(evaluateNumber("MAX(AMOUNT, 500)", { AMOUNT: 200 })).toBe(500);
    expect(evaluateNumber("ROUND(AMOUNT * 1.3333, 2)", { AMOUNT: 100 })).toBe(133.33);
  });

  it("throws FormulaError on invalid formula", () => {
    expect(() => evaluateNumber("AMOUNT *** 2", { AMOUNT: 100 })).toThrow(FormulaError);
  });

  it("throws on empty formula", () => {
    expect(() => evaluateNumber("", { AMOUNT: 100 })).toThrow(FormulaError);
  });

  it("throws on non-numeric result", () => {
    // expr-eval returns a string when concatenating literals.
    expect(() => evaluateNumber("'abc'", {})).toThrow(FormulaError);
  });
});

describe("evaluateBoolean", () => {
  it("evaluates comparisons", () => {
    expect(evaluateBoolean("AMOUNT > 500", { AMOUNT: 1000 })).toBe(true);
    expect(evaluateBoolean("AMOUNT > 500", { AMOUNT: 100 })).toBe(false);
  });

  it("supports bare = as equality", () => {
    expect(evaluateBoolean("AMOUNT = 100", { AMOUNT: 100 })).toBe(true);
    expect(evaluateBoolean("AMOUNT = 100", { AMOUNT: 99 })).toBe(false);
  });

  it("supports AND/OR (case-insensitive)", () => {
    expect(
      evaluateBoolean("AMOUNT > 100 AND AMOUNT < 1000", { AMOUNT: 500 }),
    ).toBe(true);
    expect(
      evaluateBoolean("AMOUNT < 100 OR AMOUNT > 1000", { AMOUNT: 500 }),
    ).toBe(false);
  });
});

describe("evaluateFormula edge cases", () => {
  it("supports nested member access via context", () => {
    const r = evaluateFormula("CUSTOMER.PhoneNumber", {
      CUSTOMER: { PhoneNumber: "+22507" },
    });
    expect(r).toBe("+22507");
  });
});
