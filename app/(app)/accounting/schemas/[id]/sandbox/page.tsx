"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, FlaskConical } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { RoleGuard } from "@/components/AuthGuard";
import { SandboxInputs } from "@/components/accounting/SandboxInputs";
import { SandboxOutput } from "@/components/accounting/SandboxOutput";
import { useAccountingSchema } from "@/lib/api/accounting";
import { simulate, type SimulationContext } from "@/lib/accounting/simulator";
import { validateSchemaForSimulation } from "@/lib/accounting/validate";
import { SCENARIOS, type SandboxScenario } from "@/lib/accounting/scenarios";
import { TransactionTypeLabel } from "@/lib/enums";
import { ROLE_FINANCE_SET, hasRole } from "@/lib/auth/jwt";
import { toast } from "sonner";
import type { AccountingSchema } from "@/lib/api/types";
import type { SimulationResult } from "@/lib/accounting/simulator";

const DEFAULT_CONTEXT: SimulationContext = {
  AMOUNT: 10_000,
  currency: "XOF",
  PARTNER: { Balance: 100_000, AccountCode: "" },
  CUSTOMER: { PhoneNumber: "", BankAccount: "" },
};

export default function SandboxPage() {
  const { id } = useParams<{ id: string }>();
  const { data: schema, isLoading } = useAccountingSchema(id);
  const [draftCtx, setDraftCtx] = React.useState<SimulationContext>(DEFAULT_CONTEXT);
  const [activeSchema, setActiveSchema] = React.useState<AccountingSchema | null>(null);
  const [activeScenario, setActiveScenario] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<SimulationResult | null>(null);
  const [hasRun, setHasRun] = React.useState(false);
  const [validationIssues, setValidationIssues] = React.useState<
    ReturnType<typeof validateSchemaForSimulation>
  >([]);

  React.useEffect(() => {
    if (schema && !activeSchema) setActiveSchema(schema);
  }, [schema, activeSchema]);

  function runSimulation(ctx: SimulationContext, linesSchema: AccountingSchema) {
    const issues = validateSchemaForSimulation(linesSchema);
    setValidationIssues(issues);
    if (issues.length > 0) {
      toast.error(issues[0].message);
      setResult(null);
      setHasRun(true);
      return;
    }
    if (ctx.AMOUNT <= 0) {
      toast.error("Le montant doit être strictement positif.");
      return;
    }
    setResult(simulate(linesSchema, ctx));
    setHasRun(true);
  }

  function handleSimulate() {
    if (!activeSchema) return;
    runSimulation(draftCtx, activeSchema);
  }

  function loadScenario(s: SandboxScenario, amountOverride?: number) {
    const ctx: SimulationContext = {
      ...s.context,
      AMOUNT: amountOverride ?? s.context.AMOUNT,
    };
    setDraftCtx(ctx);
    const scenarioSchema: AccountingSchema = {
      id: schema?.id ?? "scenario",
      code: schema?.code ?? s.id,
      name: s.title,
      description: s.description,
      isActive: true,
      channel: schema?.channel ?? 0,
      transactionType: schema?.transactionType ?? 0,
      lines: s.lines,
      createdAt: new Date().toISOString(),
    };
    setActiveSchema(scenarioSchema);
    setActiveScenario(s.id);
    runSimulation(ctx, scenarioSchema);
  }

  function resetToSchema() {
    if (schema) {
      setActiveSchema(schema);
      setActiveScenario(null);
      setDraftCtx(DEFAULT_CONTEXT);
      setResult(null);
      setHasRun(false);
      setValidationIssues([]);
    }
  }

  if (isLoading || !schema) {
    return <Skeleton className="h-96 w-full" />;
  }

  const txLabel =
    TransactionTypeLabel[
      (activeSchema ?? schema).transactionType as keyof typeof TransactionTypeLabel
    ];

  return (
    <RoleGuard allow={(role) => hasRole(role, ROLE_FINANCE_SET)}>
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-3">
          <Link href={`/accounting/schemas/${id}`}>
            <ChevronLeft /> Retour au schéma
          </Link>
        </Button>

        <PageHeader
          title="Simulateur"
          description={
            <span className="flex flex-wrap items-center gap-2">
              <span>Tester</span>
              <code className="font-mono text-xs">{schema.code}</code>
              <Badge variant="outline">{txLabel}</Badge>
              {activeScenario && <Badge variant="info">Scénario : {activeScenario}</Badge>}
            </span>
          }
          actions={
            <>
              <Button asChild variant="secondary">
                <Link href={`/accounting/schemas/${id}/playground`}>
                  <FlaskConical /> Bac à sable
                </Link>
              </Button>
              {activeScenario && (
                <Button variant="ghost" onClick={resetToSchema}>
                  Revenir au schéma serveur
                </Button>
              )}
            </>
          }
        />

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-h3">Scénarios pré-chargés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              {SCENARIOS.map((s) => (
                <div
                  key={s.id}
                  className={`rounded-lg border p-4 transition-colors ${
                    activeScenario === s.id ? "border-accent bg-accent/10" : "border-border"
                  }`}
                >
                  <div className="font-medium">{s.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{s.description}</div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                    <Badge variant="muted">{s.lines.length} lignes</Badge>
                    <Badge variant={s.expected.balance === 0 ? "success" : "danger"}>
                      attendu ⇒ {s.expected.balance === 0 ? "équilibré" : "déséquilibre"}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => loadScenario(s)}>
                      Charger
                    </Button>
                    {s.id === "wallet-conditional" && (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => loadScenario(s, 3000)}
                        >
                          AMOUNT=3000
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => loadScenario(s, 8000)}
                        >
                          AMOUNT=8000
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {validationIssues.length > 0 && hasRun && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            Validation schéma : {validationIssues.map((i) => i.message).join(" · ")}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(280px,400px)_1fr]">
          <SandboxInputs
            value={draftCtx}
            onChange={setDraftCtx}
            txTypeLabel={txLabel}
            onSimulate={handleSimulate}
            simulateDisabled={!activeSchema}
          />
          <SandboxOutput
            result={result ?? emptyResult()}
            amount={draftCtx.AMOUNT}
            currency={draftCtx.currency ?? "XOF"}
            schemaName={activeSchema?.name ?? schema.name}
            hidden={!hasRun}
          />
        </div>
      </div>
    </RoleGuard>
  );
}

function emptyResult(): SimulationResult {
  return {
    movements: [],
    feeAmount: 0,
    netAmount: 0,
    totalDebit: 0,
    totalCredit: 0,
    balance: 0,
    isBalanced: false,
    errors: [],
  };
}
