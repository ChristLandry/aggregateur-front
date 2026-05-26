/**
 * Client-side formula evaluator that mimics NCalc semantics.
 *
 * Built on top of expr-eval. We pre-process the source formula so it
 * is digestible by expr-eval while still feeling like NCalc:
 *
 *   - `IF(cond, a, b)`              → ternary `(cond ? a : b)`
 *   - `ROUND(x, n)`                 → builtin function `round(x, n)`
 *   - `MIN/MAX/ABS/FLOOR/CEILING`   → lower-case equivalents
 *   - `AND` / `OR` / `NOT`          → `and` / `or` / `not`
 *   - `<>`                          → `!=`
 *   - bare `=` (not `==`, `<=`, `>=`, `!=`)  → `==`
 *   - dotted identifiers like `PARTNER.Balance` → `PARTNER_Balance`
 *
 * The context object is flattened the same way so variables match.
 */
import { Parser } from "expr-eval";

export type EvalContext = Record<string, unknown>;

export class FormulaError extends Error {
  constructor(message: string, public formula?: string) {
    super(message);
    this.name = "FormulaError";
  }
}

const parser = new Parser({
  allowMemberAccess: false,
  operators: {
    add: true,
    concatenate: false,
    conditional: true,
    divide: true,
    factorial: false,
    multiply: true,
    power: true,
    remainder: true,
    subtract: true,
    logical: true,
    comparison: true,
    in: false,
    assignment: false,
  },
});

// Inject IF(a,b,c) helper directly as a function name we'll rewrite to.
// expr-eval already supports `?:` ternary; we expose `_if` so users can keep IF().
parser.functions._if = (a: unknown, b: unknown, c: unknown) => (a ? b : c);
parser.functions.round = (x: number, n: number = 0) => {
  const m = Math.pow(10, n);
  return Math.round(x * m) / m;
};
parser.functions.iif = parser.functions._if;

/**
 * Flatten a nested context into one where dotted access is replaced by
 * underscore. Example: { PARTNER: { Balance: 5 } } → { PARTNER_Balance: 5 }.
 * Existing top-level keys are kept.
 */
export function flattenContext(ctx: EvalContext, prefix = ""): EvalContext {
  const out: EvalContext = {};
  for (const [k, v] of Object.entries(ctx)) {
    const key = prefix ? `${prefix}_${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(out, flattenContext(v as EvalContext, key));
      // also keep the top-level key (useful for L1..LN)
      if (!prefix) out[k] = v;
    } else {
      out[key] = v;
    }
  }
  return out;
}

/**
 * Normalize an NCalc-ish source into something expr-eval understands.
 */
export function normalizeFormula(src: string): string {
  let s = src.trim();

  // Replace dotted identifiers (e.g. PARTNER.Balance → PARTNER_Balance).
  // Match runs of word characters separated by dots, not preceded by a digit-only token (to spare decimals).
  s = s.replace(/\b([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)+)\b/g, (m) => m.replace(/\./g, "_"));

  // Replace IF(...) / IIF(...) with our _if(...).
  s = s.replace(/\b(IF|IIF)\s*\(/gi, "_if(");

  // Function name harmonisation (case-insensitive).
  s = s.replace(/\b(MIN|MAX|ABS|FLOOR|CEILING|CEIL|ROUND|SQRT|POW|LOG|EXP)\b/g, (m) => {
    const lower = m.toLowerCase();
    if (lower === "ceiling") return "ceil";
    return lower;
  });

  // <>  → !=
  s = s.replace(/<>/g, "!=");

  // Logical operators (word form, case insensitive) → expr-eval lowercase.
  s = s.replace(/\bAND\b/gi, "and");
  s = s.replace(/\bOR\b/gi, "or");
  s = s.replace(/\bNOT\b/gi, "not");

  // Bare `=` → `==` (but leave `==`, `<=`, `>=`, `!=` alone).
  s = s.replace(/([^=<>!])=(?!=)/g, "$1==");

  return s;
}

/**
 * Evaluate an NCalc-like formula against the given context.
 * Throws FormulaError on parse/runtime errors.
 */
export function evaluateFormula(formula: string, ctx: EvalContext): unknown {
  if (!formula || !formula.trim()) {
    throw new FormulaError("Formule vide", formula);
  }
  const normalized = normalizeFormula(formula);
  const flat = flattenContext(ctx);
  try {
    const expr = parser.parse(normalized);
    return expr.evaluate(flat as Record<string, number>);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new FormulaError(`Erreur formule: ${msg}`, formula);
  }
}

/**
 * Convenience helper: evaluate as a finite number, coerce bool → 0/1.
 */
export function evaluateNumber(formula: string, ctx: EvalContext): number {
  const v = evaluateFormula(formula, ctx);
  if (typeof v === "boolean") return v ? 1 : 0;
  const n = typeof v === "string" ? Number(v) : (v as number);
  if (typeof n !== "number" || !Number.isFinite(n)) {
    throw new FormulaError(`Résultat non numérique: ${String(v)}`, formula);
  }
  return n;
}

/**
 * Convenience helper: evaluate as a boolean (used for IsConditional).
 */
export function evaluateBoolean(formula: string, ctx: EvalContext): boolean {
  const v = evaluateFormula(formula, ctx);
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") return v.length > 0 && v !== "0" && v.toLowerCase() !== "false";
  return !!v;
}
