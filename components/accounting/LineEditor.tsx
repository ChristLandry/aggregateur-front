"use client";

import * as React from "react";
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AccountType, LedgerSide } from "@/lib/enums";
import { cn } from "@/lib/utils";
import type { AccountingLine } from "@/lib/api/types";

interface LineEditorProps {
  /** Lines to render — already sorted by lineOrder. */
  value: AccountingLine[];
  onChange: (next: AccountingLine[]) => void;
  /** Lines that changed vs the server (highlighted). */
  diffIds?: Set<string>;
}

export function LineEditor({ value, onChange, diffIds }: LineEditorProps) {
  function patch(idx: number, patch: Partial<AccountingLine>) {
    const next = [...value];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  }
  function remove(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }
  function add() {
    const nextOrder = (value.at(-1)?.lineOrder ?? 0) + 1;
    onChange([
      ...value,
      {
        id: `local-${Date.now()}`,
        schemaId: value[0]?.schemaId ?? "local",
        lineOrder: nextOrder,
        accountType: AccountType.Fixed,
        accountCode: "",
        accountExpression: "",
        side: LedgerSide.Debit,
        amountFormula: "AMOUNT",
        label: "",
        code: "",
        exploitant: "",
        isFee: false,
        isConditional: false,
        condition: "",
      },
    ]);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Lignes (modifiables localement)</CardTitle>
        <Button size="sm" onClick={add}>
          <Plus /> Ajouter
        </Button>
      </CardHeader>
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
            {value.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  Aucune ligne — ajoutez-en une pour commencer.
                </TableCell>
              </TableRow>
            ) : (
              value.map((line, idx) => {
                const modified = diffIds?.has(line.id);
                return (
                  <TableRow
                    key={line.id}
                    className={cn(modified && "bg-info/5")}
                  >
                    <TableCell>
                      <Input
                        type="number"
                        className="h-8 w-14"
                        min={1}
                        value={line.lineOrder}
                        onChange={(e) => patch(idx, { lineOrder: Number(e.target.value) })}
                      />
                    </TableCell>
                    <TableCell className="min-w-[200px]">
                      <div className="flex gap-2">
                        <Select
                          value={String(line.accountType)}
                          onValueChange={(v) => patch(idx, { accountType: Number(v) })}
                        >
                          <SelectTrigger className="h-8 w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={String(AccountType.Fixed)}>Fixe</SelectItem>
                            <SelectItem value={String(AccountType.Dynamic)}>Dyn.</SelectItem>
                          </SelectContent>
                        </Select>
                        {line.accountType === AccountType.Dynamic ? (
                          <Input
                            className="h-8 font-mono text-xs"
                            placeholder="PARTNER.AccountCode"
                            value={line.accountExpression ?? ""}
                            onChange={(e) => patch(idx, { accountExpression: e.target.value })}
                          />
                        ) : (
                          <Input
                            className="h-8 font-mono text-xs"
                            placeholder="411001"
                            value={line.accountCode ?? ""}
                            onChange={(e) => patch(idx, { accountCode: e.target.value })}
                          />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={String(line.side)}
                        onValueChange={(v) => patch(idx, { side: Number(v) })}
                      >
                        <SelectTrigger className="h-8 w-[90px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={String(LedgerSide.Debit)}>Débit</SelectItem>
                          <SelectItem value={String(LedgerSide.Credit)}>Crédit</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="min-w-[180px]">
                      <Input
                        className="h-8 font-mono text-xs"
                        value={line.amountFormula}
                        onChange={(e) => patch(idx, { amountFormula: e.target.value })}
                      />
                      {line.isConditional && (
                        <Input
                          className="mt-1 h-8 font-mono text-xs"
                          placeholder="Condition (ex: AMOUNT > 5000)"
                          value={line.condition ?? ""}
                          onChange={(e) => patch(idx, { condition: e.target.value })}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8"
                        value={line.label ?? ""}
                        onChange={(e) => patch(idx, { label: e.target.value })}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={line.isFee}
                        onCheckedChange={(checked) => patch(idx, { isFee: checked })}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={line.isConditional}
                        onCheckedChange={(checked) => patch(idx, { isConditional: checked })}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {modified && <Badge variant="info">Modifié</Badge>}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => remove(idx)}
                          aria-label="Supprimer"
                          className="text-destructive"
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
