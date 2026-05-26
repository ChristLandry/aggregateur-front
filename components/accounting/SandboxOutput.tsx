"use client";

import { CheckCircle2, Download, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LedgerSide } from "@/lib/enums";
import { cn, downloadBlob, formatCurrency } from "@/lib/utils";
import type { SimulationResult } from "@/lib/accounting/simulator";

interface SandboxOutputProps {
  result: SimulationResult;
  currency: string;
  amount: number;
  schemaName?: string;
  /** Masque le bandeau si aucune simulation n'a encore été lancée. */
  hidden?: boolean;
}

export function SandboxOutput({
  result,
  currency,
  amount,
  schemaName,
  hidden,
}: SandboxOutputProps) {
  if (hidden) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          Configurez les paramètres puis cliquez sur <strong>Simuler</strong>.
        </CardContent>
      </Card>
    );
  }

  const {
    movements,
    feeAmount,
    netAmount,
    totalDebit,
    totalCredit,
    balance,
    isBalanced,
    errors,
  } = result;

  function exportJson() {
    const payload = {
      schemaName,
      generatedAt: new Date().toISOString(),
      input: { amount, currency },
      result,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const ts = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19);
    downloadBlob(blob, `simulation-${schemaName ?? "schema"}-${ts}.json`);
  }

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4",
          isBalanced && errors.length === 0
            ? "border-success/30 bg-success/5"
            : "border-destructive/30 bg-destructive/5",
        )}
      >
        <div className="flex items-center gap-3">
          {isBalanced && errors.length === 0 ? (
            <CheckCircle2 className="h-5 w-5 text-success" />
          ) : (
            <XCircle className="h-5 w-5 text-destructive" />
          )}
          <div>
            <div className="font-medium">
              {errors.length > 0
                ? `Erreur formule — ligne ${errors[0].lineOrder}`
                : isBalanced
                  ? "Schéma équilibré"
                  : "Schéma non équilibré"}
            </div>
            <div className="text-xs text-muted-foreground">
              {errors.length > 0 ? (
                <span className="text-destructive">{errors[0].message}</span>
              ) : (
                <>
                  Écart comptable :{" "}
                  <span className="font-mono">{formatCurrency(balance, currency)}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={exportJson}>
          <Download /> Exporter le rapport
        </Button>
      </div>

      {errors.length > 1 && (
        <Card className="border-destructive/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-destructive text-h3">
              <AlertTriangle className="h-4 w-4" /> {errors.length} erreur(s)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {errors.map((e, i) => (
              <div key={i} className="text-sm">
                <code className="font-mono text-xs">L{e.lineOrder}</code> — {e.field} :{" "}
                <span className="text-destructive">{e.message}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Mouvements générés</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Ordre</TableHead>
                <TableHead>Compte</TableHead>
                <TableHead>Côté</TableHead>
                <TableHead>Formule</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Exploitant</TableHead>
                <TableHead className="text-center">IsFee</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    Aucun mouvement.
                  </TableCell>
                </TableRow>
              ) : (
                movements.map((m) => {
                  const hasError = errors.some((e) => e.lineOrder === m.lineOrder);
                  return (
                    <TableRow
                      key={`${m.lineOrder}-${m.lineId ?? "x"}`}
                      className={cn(
                        m.skipped && "opacity-50",
                        hasError && "bg-destructive/5",
                      )}
                    >
                      <TableCell className="font-mono">{m.lineOrder}</TableCell>
                      <TableCell className="font-mono text-xs max-w-[120px] truncate">
                        {m.account || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={m.side === LedgerSide.Debit ? "danger" : "success"}
                        >
                          {m.side === LedgerSide.Debit ? "Débit" : "Crédit"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs min-w-[200px]">
                        <span className="text-muted-foreground">{m.formula}</span>
                        {!m.skipped && !hasError && (
                          <span className="ml-2 text-foreground">⇒ {m.rawAmount.toFixed(2)}</span>
                        )}
                        {m.skipped && (
                          <span className="ml-2 text-warning">(ignorée)</span>
                        )}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-mono whitespace-nowrap",
                          m.amount < 0 && "text-destructive",
                          m.amount > 0 && "text-success",
                        )}
                      >
                        {formatCurrency(m.amount, currency)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{m.code ?? "—"}</TableCell>
                      <TableCell className="text-xs">{m.exploitant ?? "—"}</TableCell>
                      <TableCell className="text-center">
                        {m.isFee ? <Badge variant="warning">Oui</Badge> : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Résumé</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Total Débit</dt>
              <dd className="font-mono text-destructive">
                {formatCurrency(totalDebit, currency)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Total Crédit</dt>
              <dd className="font-mono text-success">
                {formatCurrency(totalCredit, currency)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Écart (doit être 0)</dt>
              <dd
                className={cn(
                  "font-mono font-medium",
                  Math.abs(balance) < 0.005 ? "text-success" : "text-destructive",
                )}
              >
                {formatCurrency(balance, currency)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">FeeAmount</dt>
              <dd className="font-mono text-warning">
                {formatCurrency(feeAmount, currency)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">NetAmount (AMOUNT − FeeAmount)</dt>
              <dd className="font-mono text-success">
                {formatCurrency(netAmount, currency)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Montant brut (AMOUNT)</dt>
              <dd className="font-mono">{formatCurrency(amount, currency)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
