"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAccountingSchemas } from "@/lib/api/accounting";
import { useAttachSchema } from "@/lib/api/partner-endpoints";

interface SchemaAttachSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  endpointId: string | null;
  title: string;
  description?: string;
  initialSchemaId?: string;
}

export function SchemaAttachSheet({
  open,
  onOpenChange,
  endpointId,
  title,
  description,
  initialSchemaId,
}: SchemaAttachSheetProps) {
  const { data: schemas, isLoading } = useAccountingSchemas();
  const attach = useAttachSchema();
  const [schemaId, setSchemaId] = React.useState(initialSchemaId ?? "");

  React.useEffect(() => {
    if (open) setSchemaId(initialSchemaId ?? "");
  }, [open, initialSchemaId]);

  const activeSchemas = (schemas ?? []).filter((s) => s.isActive !== false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>

        <div className="flex-1 space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Schéma comptable</label>
            <Select
              value={schemaId}
              onValueChange={setSchemaId}
              disabled={isLoading || !endpointId}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoading ? "Chargement…" : "Choisir un schéma"} />
              </SelectTrigger>
              <SelectContent>
                {activeSchemas.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="font-mono text-xs">{s.code}</span>
                    {" — "}
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <SheetFooter className="border-t border-border pt-4">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            disabled={!endpointId || !schemaId || attach.isPending}
            onClick={async () => {
              if (!endpointId || !schemaId) return;
              await attach.mutateAsync({ id: endpointId, schemaId });
              onOpenChange(false);
            }}
          >
            {attach.isPending && <Loader2 className="animate-spin" />}
            Enregistrer
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
