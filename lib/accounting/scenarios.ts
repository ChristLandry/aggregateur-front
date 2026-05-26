/**
 * Pre-built sandbox scenarios. Each one ships its own AccountingLine[]
 * (independent from the loaded schema) and a SimulationContext so the
 * user can click "Charger" to verify the simulator behaves correctly.
 */
import { AccountType, LedgerSide } from "@/lib/enums";
import type { AccountingLine } from "@/lib/api/types";
import type { SimulationContext } from "./simulator";

export interface SandboxScenario {
  id: string;
  title: string;
  description: string;
  context: SimulationContext;
  lines: AccountingLine[];
  /** Expected values (informational, shown in the UI). */
  expected: {
    feeAmount: number;
    netAmount: number;
    balance: number;
    movementCount: number;
  };
}

function line(
  partial: Pick<
    AccountingLine,
    | "lineOrder"
    | "side"
    | "amountFormula"
    | "accountCode"
    | "label"
  > &
    Partial<AccountingLine>,
): AccountingLine {
  return {
    id: `mock-${partial.lineOrder}`,
    schemaId: "mock-schema",
    accountType: AccountType.Fixed,
    accountExpression: undefined,
    code: undefined,
    exploitant: undefined,
    isFee: false,
    isConditional: false,
    condition: undefined,
    ...partial,
  };
}

export const SCENARIOS: SandboxScenario[] = [
  {
    id: "bank-debit-basic",
    title: "BankDebit basique",
    description:
      "3 lignes : débit du compte client, frais 5% en crédit (IsFee), et crédit net du partenaire.",
    context: {
      AMOUNT: 1000,
      currency: "XOF",
      PARTNER: { Balance: 50_000, AccountCode: "411001" },
      CUSTOMER: { BankAccount: "CI001234" },
    },
    lines: [
      line({
        lineOrder: 1,
        side: LedgerSide.Debit,
        amountFormula: "AMOUNT",
        accountCode: "411000",
        label: "Débit client",
      }),
      line({
        lineOrder: 2,
        side: LedgerSide.Credit,
        amountFormula: "AMOUNT * 0.05",
        accountCode: "706000",
        label: "Frais",
        isFee: true,
      }),
      line({
        lineOrder: 3,
        side: LedgerSide.Credit,
        amountFormula: "L1 - L2",
        accountCode: "411001",
        label: "Crédit partenaire (net)",
      }),
    ],
    expected: {
      feeAmount: 50,
      netAmount: 950,
      balance: 0,
      movementCount: 3,
    },
  },
  {
    id: "wallet-conditional",
    title: "WalletCredit avec condition",
    description:
      "Une ligne conditionnelle (AMOUNT > 5000) — testez avec 3000 (ignorée) puis 8000 (active).",
    context: {
      AMOUNT: 8000,
      currency: "XOF",
      PARTNER: { Balance: 100_000, AccountCode: "521001" },
      CUSTOMER: { PhoneNumber: "+22507000000" },
    },
    lines: [
      line({
        lineOrder: 1,
        side: LedgerSide.Credit,
        amountFormula: "AMOUNT",
        accountCode: "411000",
        label: "Crédit client",
      }),
      line({
        lineOrder: 2,
        side: LedgerSide.Debit,
        amountFormula: "AMOUNT",
        accountCode: "521001",
        label: "Débit partenaire",
      }),
      line({
        lineOrder: 3,
        side: LedgerSide.Credit,
        amountFormula: "100",
        accountCode: "758000",
        label: "Bonus grosse opération",
        isConditional: true,
        condition: "AMOUNT > 5000",
      }),
      line({
        lineOrder: 4,
        side: LedgerSide.Debit,
        amountFormula: "L3",
        accountCode: "521001",
        label: "Contre-passation bonus",
        isConditional: true,
        condition: "AMOUNT > 5000",
      }),
    ],
    expected: {
      feeAmount: 0,
      netAmount: 8000,
      balance: 0,
      movementCount: 4,
    },
  },
  {
    id: "stacked-fees",
    title: "Frais cumulés (deux IsFee)",
    description:
      "Deux lignes marquées IsFee doivent additionner leurs montants dans FeeAmount.",
    context: {
      AMOUNT: 2000,
      currency: "XOF",
      PARTNER: { Balance: 80_000, AccountCode: "411001" },
    },
    lines: [
      line({
        lineOrder: 1,
        side: LedgerSide.Debit,
        amountFormula: "AMOUNT",
        accountCode: "411000",
        label: "Débit client",
      }),
      line({
        lineOrder: 2,
        side: LedgerSide.Credit,
        amountFormula: "100",
        accountCode: "706001",
        label: "Frais fixes",
        isFee: true,
      }),
      line({
        lineOrder: 3,
        side: LedgerSide.Credit,
        amountFormula: "AMOUNT * 0.02",
        accountCode: "706002",
        label: "Frais variables 2%",
        isFee: true,
      }),
      line({
        lineOrder: 4,
        side: LedgerSide.Credit,
        amountFormula: "AMOUNT - FEE",
        accountCode: "411001",
        label: "Crédit partenaire (net)",
      }),
    ],
    expected: {
      feeAmount: 140, // 100 + 40
      netAmount: 1860,
      balance: 0,
      movementCount: 4,
    },
  },
];
