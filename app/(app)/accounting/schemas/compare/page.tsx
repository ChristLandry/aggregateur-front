"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, GitCompare, Eye, EyeOff } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SandboxInputs } from "@/components/accounting/SandboxInputs";
import { SandboxOutput } from "@/components/accounting/SandboxOutput";
import { RoleGuard } from "@/components/AuthGuard";
import {
  useAccountingSchema,
  useAccountingSchemas,
} from "@/lib/api/accounting";
import { simulate, type SimulationContext } from "@/lib/accounting/simulator";
import { AccountType, LedgerSide, TransactionTypeLabel } from "@/lib/enums";
import { ROLE_FINANCE_SET, hasRole } from "@/lib/auth/jwt";
import { cn } from "@/lib/utils";
import type { AccountingLine, AccountingSchema } from "@/lib/api/types";

const DEFAULT_CONTEXT: SimulationContext = {
  AMOUNT: 10_000,
  currency: "XOF",
  PARTNER: { Balance: 100_000, AccountCode: "" },
  CUSTOMER: {},
};

export default function CompareSchemasPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <CompareSchemasInner />
    </Suspense>
  );
}

function CompareSchemasInner() {
  const router = useRouter();
  const params = useSearchParams();
  const idsParam = params?.get("ids") ?? "";
  const [a, b] = idsParam.split(",");
  const { data: list } = useAccountingSchemas();
  const { data: schemaA, isLoading: la } = useAccountingSchema(a);
  const { data: schemaB, isLoading: lb } = useAccountingSchema(b);
  const [ctx, setCtx] = React.useState<SimulationContext>(DEFAULT_CONTEXT);
  const [diffOnly, setDiffOnly] = React.useState(false);

  function setIds(next: { a?: string; b?: string }) {
    const aId = next.a ?? a ?? "";
    const bId = next.b ?? b ?? "";
    router.push(`/accounting/schemas/compare?ids=${aId},${bId}`);
  }

  const resultA = React.useMemo(
    () => (schemaA ? simulate(schemaA, ctx) : null),
    [schemaA, ctx],
  );
  const resultB = React.useMemo(
    () => (schemaB ? simulate(schemaB, ctx) : null),
    [schemaB, ctx],
  );

  // Diff at the line level by lineOrder.
  const diff = React.useMemo(() => {
    const ma = lineMap(schemaA?.lines ?? []);
    const mb = lineMap(schemaB?.lines ?? []);
    const orders = Array.from(
      new Set([...Array.from(ma.keys()), ...Array.from(mb.keys())]),
    ).sort((x, y) => x - y);
    return orders.map((o) => {
      const la = ma.get(o);
      const lb = mb.get(o);
      const same = la && lb ? sameLine(la, lb) : false;
      return { order: o, a: la, b: lb, same };
    });
  }, [schemaA, schemaB]);

  const visibleDiff = diffOnly ? diff.filter((row) => !row.same) : diff;

  return (
    <RoleGuard allow={(role) => hasRole(role, ROLE_FINANCE_SET)}>
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-3">
          <Link href="/accounting/schemas">
            <ChevronLeft /> Schémas
          </Link>
        </Button>

        <PageHeader
          title="Comparer deux schémas"
          description="Sélectionnez deux schémas pour les comparer ligne à ligne et lancer une simulation partagée."
          actions={
            <Button
              variant="secondary"
              onClick={() => setDiffOnly((v) => !v)}
              disabled={!schemaA || !schemaB}
            >
              {diffOnly ? <Eye /> : <EyeOff />}
              {diffOnly ? "Tout afficher" : "Différences uniquement"}
            </Button>
          }
        />

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[13px] font-medium">Schéma A</label>
                <Select value={a ?? ""} onValueChange={(v) => setIds({ a: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un schéma…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(list ?? []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} <span className="font-mono text-xs">({s.code})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[13px] font-medium">Schéma B</label>
                <Select value={b ?? ""} onValueChange={(v) => setIds({ b: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un schéma…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(list ?? []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} <span className="font-mono text-xs">({s.code})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {!a || !b ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Choisissez deux schémas pour démarrer la comparaison.
            </CardContent>
          </Card>
        ) : la || lb || !schemaA || !schemaB ? (
          <Skeleton className="h-96 w-full" />
        ) : (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitCompare className="h-4 w-4" /> Diff des lignes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-surface-muted text-[12px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left w-12">#</th>
                      <th className="px-4 py-2 text-left">
                        Schéma A — <span className="font-mono">{schemaA.code}</span>
                      </th>
                      <th className="px-4 py-2 text-left">
                        Schéma B — <span className="font-mono">{schemaB.code}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleDiff.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-muted-foreground">
                          {diffOnly ? "Aucune différence" : "Aucune ligne"}
                        </td>
                      </tr>
                    ) : (
                      visibleDiff.map((row) => (
                        <tr
                          key={row.order}
                          className={cn(
                            "border-t border-border align-top",
                            !row.same && "bg-warning/5",
                          )}
                        >
                          <td className="px-4 py-3 font-mono">{row.order}</td>
                          <td className="px-4 py-3">
                            {row.a ? <LineSummary line={row.a} /> : (
                              <Badge variant="muted">absente</Badge>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {row.b ? <LineSummary line={row.b} /> : (
                              <Badge variant="muted">absente</Badge>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-[400px_1fr]">
              <SandboxInputs value={ctx} onChange={setCtx} />
              <div className="grid gap-6 lg:grid-cols-2">
                <SimulationPanel label="Schéma A" schema={schemaA} result={resultA} ctx={ctx} />
                <SimulationPanel label="Schéma B" schema={schemaB} result={resultB} ctx={ctx} />
              </div>
            </div>
          </>
        )}
      </div>
    </RoleGuard>
  );
}

function SimulationPanel({
  label,
  schema,
  result,
  ctx,
}: {
  label: string;
  schema: AccountingSchema;
  result: ReturnType<typeof simulate> | null;
  ctx: SimulationContext;
}) {
  if (!result) return null;
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Badge variant="info">{label}</Badge>
        <span className="font-medium text-sm">{schema.name}</span>
        <Badge variant="outline">
          {TransactionTypeLabel[schema.transactionType as keyof typeof TransactionTypeLabel]}
        </Badge>
      </div>
      <SandboxOutput
        result={result}
        amount={ctx.AMOUNT}
        currency={ctx.currency ?? "XOF"}
        schemaName={schema.name}
      />
    </div>
  );
}

function LineSummary({ line }: { line: AccountingLine }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Badge variant={line.side === LedgerSide.Debit ? "danger" : "success"}>
          {line.side === LedgerSide.Debit ? "D" : "C"}
        </Badge>
        <code className="font-mono text-xs">
          {line.accountType === AccountType.Dynamic
            ? line.accountExpression
            : line.accountCode}
        </code>
        {line.isFee && <Badge variant="warning">Frais</Badge>}
      </div>
      <div className="font-mono text-xs text-muted-foreground">{line.amountFormula}</div>
      {line.isConditional && (
        <div className="font-mono text-[11px] text-info">si {line.condition}</div>
      )}
      {line.label && <div className="text-xs">{line.label}</div>}
    </div>
  );
}

function lineMap(lines: AccountingLine[]): Map<number, AccountingLine> {
  return new Map(lines.map((l) => [l.lineOrder, l]));
}

function sameLine(a: AccountingLine, b: AccountingLine): boolean {
  const keys: (keyof AccountingLine)[] = [
    "accountType",
    "accountCode",
    "accountExpression",
    "side",
    "amountFormula",
    "label",
    "isFee",
    "isConditional",
    "condition",
  ];
  return keys.every((k) => (a[k] ?? "") === (b[k] ?? ""));
}
