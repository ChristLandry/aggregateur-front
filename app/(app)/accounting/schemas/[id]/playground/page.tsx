"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ChevronLeft,
  CloudUpload,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { RoleGuard } from "@/components/AuthGuard";
import { SandboxInputs } from "@/components/accounting/SandboxInputs";
import { SandboxOutput } from "@/components/accounting/SandboxOutput";
import { LineEditor } from "@/components/accounting/LineEditor";
import {
  useAccountingSchema,
  useAddSchemaLine,
  useDeleteSchemaLine,
  useUpdateSchema,
} from "@/lib/api/accounting";
import { simulate, type SimulationContext } from "@/lib/accounting/simulator";
import { validateSchemaForSimulation } from "@/lib/accounting/validate";
import { TransactionTypeLabel } from "@/lib/enums";
import { ROLE_FINANCE_SET, hasRole } from "@/lib/auth/jwt";
import { toast } from "sonner";
import type { AccountingLine } from "@/lib/api/types";

const DEFAULT_CONTEXT: SimulationContext = {
  AMOUNT: 10_000,
  currency: "XOF",
  PARTNER: { Balance: 100_000, AccountCode: "" },
  CUSTOMER: {},
};

export default function PlaygroundPage() {
  const { id } = useParams<{ id: string }>();
  const { data: schema, isLoading, refetch } = useAccountingSchema(id);
  const update = useUpdateSchema(id);
  const addLine = useAddSchemaLine(id);
  const delLine = useDeleteSchemaLine(id);

  const [ctx, setCtx] = React.useState<SimulationContext>(DEFAULT_CONTEXT);
  const [localLines, setLocalLines] = React.useState<AccountingLine[] | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pushing, setPushing] = React.useState(false);

  // Initialize local copy when server schema loads.
  React.useEffect(() => {
    if (schema && localLines === null) {
      setLocalLines(sortLines(schema.lines ?? []));
    }
  }, [schema, localLines]);

  const sorted = React.useMemo(() => sortLines(localLines ?? []), [localLines]);

  const validationIssues = React.useMemo(
    () => (schema ? validateSchemaForSimulation({ ...schema, lines: sorted }) : []),
    [schema, sorted],
  );

  const result = React.useMemo(
    () =>
      validationIssues.length === 0 && ctx.AMOUNT > 0
        ? simulate({ lines: sorted }, ctx)
        : {
            movements: [],
            feeAmount: 0,
            netAmount: 0,
            totalDebit: 0,
            totalCredit: 0,
            balance: 0,
            isBalanced: false,
            errors: [],
          },
    [sorted, ctx, validationIssues.length],
  );

  // Compute diff vs server.
  const diff = React.useMemo(() => {
    if (!schema) return { added: [], removed: [], modified: new Set<string>() };
    return computeDiff(schema.lines ?? [], sorted);
  }, [schema, sorted]);

  const hasChanges =
    diff.added.length > 0 || diff.removed.length > 0 || diff.modified.size > 0;

  function reloadFromServer() {
    if (!schema) return;
    setLocalLines(sortLines(schema.lines ?? []));
    toast.info("Lignes rechargées depuis le serveur");
  }

  async function applyToServer() {
    if (!schema || !localLines) return;
    setPushing(true);
    try {
      // 1. Remove deleted lines.
      for (const removedId of diff.removed) {
        await delLine.mutateAsync(removedId);
      }
      // 2. Add new lines (and modified ones — we recreate them since the
      //    backend lacks an UpdateLine endpoint per the contract).
      const toCreate = [
        ...diff.added,
        ...sorted.filter((l) => diff.modified.has(l.id)),
      ];
      for (const lineToCreate of toCreate) {
        // If it was a modification, the original needs to be removed first.
        if (diff.modified.has(lineToCreate.id) && !lineToCreate.id.startsWith("local-")) {
          await delLine.mutateAsync(lineToCreate.id);
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _stripId, schemaId: _stripSchemaId, ...payload } = lineToCreate;
        await addLine.mutateAsync(payload);
      }
      // 3. Refresh and reset local mirror.
      const fresh = await refetch();
      setLocalLines(sortLines(fresh.data?.lines ?? []));
      setConfirmOpen(false);
      toast.success("Modifications appliquées au serveur");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de la sauvegarde");
    } finally {
      setPushing(false);
    }
  }

  if (isLoading || !schema || localLines === null) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <RoleGuard allow={(role) => hasRole(role, ROLE_FINANCE_SET)}>
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-3">
          <Link href={`/accounting/schemas/${id}`}>
            <ChevronLeft /> Retour au schéma
          </Link>
        </Button>

        <PageHeader
          title="Bac à sable interactif"
          description={
            <span className="flex items-center gap-2">
              <code className="font-mono text-xs">{schema.code}</code>
              <Badge variant="outline">
                {TransactionTypeLabel[schema.transactionType as keyof typeof TransactionTypeLabel]}
              </Badge>
              {hasChanges && <Badge variant="warning">Modifications non sauvegardées</Badge>}
            </span>
          }
          actions={
            <>
              <Button
                variant="secondary"
                onClick={reloadFromServer}
                disabled={!hasChanges}
              >
                <RotateCcw /> Recharger
              </Button>
              <Button
                onClick={() => setConfirmOpen(true)}
                disabled={!hasChanges || pushing}
              >
                <CloudUpload /> Appliquer au serveur
              </Button>
            </>
          }
        />

        {hasChanges && (
          <div className="mb-4 rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-sm">
            <span className="font-medium">Diff local vs serveur :</span>{" "}
            +{diff.added.length} ajoutées, −{diff.removed.length} supprimées,{" "}
            ~{diff.modified.size} modifiées.
          </div>
        )}

        {validationIssues.length > 0 && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {validationIssues.map((i, idx) => (
              <span key={idx}>
                {i.lineOrder != null && `L${i.lineOrder} : `}
                {i.message}
                {idx < validationIssues.length - 1 ? " · " : ""}
              </span>
            ))}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[400px_1fr]">
          <SandboxInputs
            value={ctx}
            onChange={setCtx}
            txTypeLabel={TransactionTypeLabel[schema.transactionType as keyof typeof TransactionTypeLabel]}
          />
          <div className="space-y-6">
            <LineEditor value={sorted} onChange={setLocalLines} diffIds={diff.modified} />
            <SandboxOutput
              result={result}
              amount={ctx.AMOUNT}
              currency={ctx.currency ?? "XOF"}
              schemaName={schema.name}
              hidden={validationIssues.length > 0 || ctx.AMOUNT <= 0}
            />
          </div>
        </div>

        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmer l&apos;application</DialogTitle>
              <DialogDescription>
                Cela appliquera {diff.added.length} ajouts, {diff.removed.length} suppressions
                et {diff.modified.size} modifications sur le serveur. Les modifications sont
                équivalentes à supprimer + recréer la ligne (l&apos;API ne supporte pas l&apos;update
                de ligne).
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={pushing}>
                Annuler
              </Button>
              <Button onClick={applyToServer} disabled={pushing}>
                {pushing && <Loader2 className="animate-spin" />}
                Confirmer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}

function sortLines(lines: AccountingLine[]): AccountingLine[] {
  return [...lines].sort((a, b) => a.lineOrder - b.lineOrder);
}

interface Diff {
  added: AccountingLine[];
  removed: string[];
  modified: Set<string>;
}

function computeDiff(server: AccountingLine[], local: AccountingLine[]): Diff {
  const serverMap = new Map(server.map((l) => [l.id, l]));
  const localMap = new Map(local.map((l) => [l.id, l]));
  const added = local.filter((l) => !serverMap.has(l.id) || l.id.startsWith("local-"));
  const removed = server.filter((l) => !localMap.has(l.id)).map((l) => l.id);
  const modified = new Set<string>();
  for (const l of local) {
    if (l.id.startsWith("local-")) continue;
    const s = serverMap.get(l.id);
    if (!s) continue;
    if (!sameLine(s, l)) modified.add(l.id);
  }
  return { added, removed, modified };
}

function sameLine(a: AccountingLine, b: AccountingLine): boolean {
  const keys: (keyof AccountingLine)[] = [
    "lineOrder",
    "accountType",
    "accountCode",
    "accountExpression",
    "side",
    "amountFormula",
    "label",
    "code",
    "exploitant",
    "isFee",
    "isConditional",
    "condition",
  ];
  return keys.every((k) => (a[k] ?? "") === (b[k] ?? ""));
}
