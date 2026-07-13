"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, FlaskConical, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { SchemaForm } from "@/components/forms/SchemaForm";
import { SchemaLineForm } from "@/components/forms/SchemaLineForm";
import {
  useAccountingSchema,
  useUpdateSchema,
  useAddSchemaLine,
  useUpdateSchemaLine,
  useDeleteSchemaLine,
} from "@/lib/api/accounting";
import {
  AccountType,
  LedgerSide,
  TransactionTypeLabel,
} from "@/lib/enums";
import { toast } from "sonner";
import type { AccountingLine } from "@/lib/api/types";
import { nextFreeLineOrder } from "@/lib/accounting/line-order";

export default function SchemaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useAccountingSchema(id);
  const update = useUpdateSchema(id);
  const addLine = useAddSchemaLine(id);
  const updateLine = useUpdateSchemaLine(id);
  const delLine = useDeleteSchemaLine(id);
  const [lineOpen, setLineOpen] = React.useState(false);
  const [editingLine, setEditingLine] = React.useState<AccountingLine | null>(null);

  if (isLoading || !data) {
    return <Skeleton className="h-64 w-full" />;
  }

  const sortedLines = [...(data.lines ?? [])].sort((a, b) => a.lineOrder - b.lineOrder);
  const nextOrder = nextFreeLineOrder(sortedLines);

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-3">
        <Link href="/accounting/schemas"><ChevronLeft /> Retour</Link>
      </Button>

      <PageHeader
        title={data.name}
        description={
          <span className="flex items-center gap-3">
            <code className="font-mono text-xs">{data.code}</code>
            <Badge variant="outline">
              {TransactionTypeLabel[data.transactionType as keyof typeof TransactionTypeLabel]}
            </Badge>
            {data.isActive ? (
              <Badge variant="success">Actif</Badge>
            ) : (
              <Badge variant="muted">Inactif</Badge>
            )}
          </span>
        }
        actions={
          <>
            <Button asChild>
              <Link href={`/accounting/schemas/${id}/sandbox`}>
                <Play /> Simulateur
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={`/accounting/schemas/${id}/playground`}>
                <FlaskConical /> Bac à sable
              </Link>
            </Button>
          </>
        }
      />

      <Tabs defaultValue="lines">
        <TabsList>
          <TabsTrigger value="lines">Lignes ({sortedLines.length})</TabsTrigger>
          <TabsTrigger value="info">Informations</TabsTrigger>
        </TabsList>

        <TabsContent value="lines">
          <div className="mb-3 flex justify-end">
            <Dialog open={lineOpen} onOpenChange={setLineOpen}>
              <DialogTrigger asChild>
                <Button><Plus /> Ajouter une ligne</Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Nouvelle ligne</DialogTitle>
                </DialogHeader>
                {lineOpen && (
                  <SchemaLineForm
                    key={`create-${nextOrder}-${sortedLines.length}`}
                    initialOrder={nextOrder}
                    existingLines={sortedLines}
                    loading={addLine.isPending}
                    onCancel={() => setLineOpen(false)}
                    onSubmit={async (v) => {
                      await addLine.mutateAsync(v);
                      setLineOpen(false);
                    }}
                  />
                )}
              </DialogContent>
            </Dialog>
          </div>

          <Dialog
            open={!!editingLine}
            onOpenChange={(open) => {
              if (!open) setEditingLine(null);
            }}
          >
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Modifier la ligne</DialogTitle>
              </DialogHeader>
              {editingLine && (
                <SchemaLineForm
                  key={editingLine.id}
                  excludeLineId={editingLine.id}
                  existingLines={sortedLines}
                  initial={{
                    lineOrder: editingLine.lineOrder,
                    accountType: editingLine.accountType,
                    accountCode: editingLine.accountCode ?? "",
                    accountExpression: editingLine.accountExpression ?? "",
                    side: editingLine.side,
                    amountFormula: editingLine.amountFormula,
                    label: editingLine.label ?? "",
                    code: editingLine.code ?? "",
                    exploitant: editingLine.exploitant ?? "",
                    isFee: editingLine.isFee,
                    isConditional: editingLine.isConditional,
                    condition: editingLine.condition ?? "",
                  }}
                  loading={updateLine.isPending}
                  submitLabel="Enregistrer"
                  onCancel={() => setEditingLine(null)}
                  onSubmit={async (v) => {
                    await updateLine.mutateAsync({
                      lineId: editingLine.id,
                      values: v,
                    });
                    setEditingLine(null);
                  }}
                />
              )}
            </DialogContent>
          </Dialog>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Compte</TableHead>
                    <TableHead>Côté</TableHead>
                    <TableHead>Formule</TableHead>
                    <TableHead>Libellé</TableHead>
                    <TableHead className="text-center">Frais</TableHead>
                    <TableHead className="text-center">Cond.</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedLines.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                        Aucune ligne — ajoutez-en une pour commencer.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedLines.map((line, idx) => (
                      <TableRow key={line.id || `line-${idx}`}>
                        <TableCell className="font-mono">{line.lineOrder}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {line.accountType === AccountType.Dynamic
                            ? line.accountExpression
                            : line.accountCode}
                        </TableCell>
                        <TableCell>
                          <Badge variant={line.side === LedgerSide.Debit ? "danger" : "success"}>
                            {line.side === LedgerSide.Debit ? "Débit" : "Crédit"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{line.amountFormula}</TableCell>
                        <TableCell>{line.label ?? "—"}</TableCell>
                        <TableCell className="text-center">
                          {line.isFee ? <Badge variant="warning">Frais</Badge> : "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          {line.isConditional ? (
                            <span className="text-xs font-mono">{line.condition}</span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setEditingLine(line)}
                              aria-label="Modifier"
                              disabled={!line.id}
                            >
                              <Pencil />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => {
                                if (!line.id) {
                                  toast.error("Identifiant de ligne manquant.");
                                  return;
                                }
                                if (confirm("Supprimer cette ligne ?")) {
                                  delLine.mutate(line.id);
                                }
                              }}
                              aria-label="Supprimer"
                              className="text-destructive"
                              disabled={!line.id || delLine.isPending}
                            >
                              <Trash2 />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info">
          <Card>
            <CardHeader><CardTitle>Édition du schéma</CardTitle></CardHeader>
            <CardContent>
              <SchemaForm
                initial={data}
                loading={update.isPending}
                onSubmit={async (patch) => {
                  if (Object.keys(patch).length === 0) {
                    toast.info("Aucun changement à enregistrer");
                    return;
                  }
                  try {
                    await update.mutateAsync(patch);
                  } catch {
                    /* toast via onError */
                  }
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
