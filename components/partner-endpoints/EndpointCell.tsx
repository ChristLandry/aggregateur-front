"use client";

import * as React from "react";
import { Link2, Loader2, MoreHorizontal, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SchemaAttachSheet } from "@/components/partner-endpoints/SchemaAttachSheet";
import {
  useCreatePartnerEndpoint,
  useDeletePartnerEndpoint,
  useDetachSchema,
} from "@/lib/api/partner-endpoints";
import {
  FinancialEndpointKey,
  FinancialEndpointKeyLabel,
} from "@/lib/enums";
import type { Partner, PartnerEndpoint } from "@/lib/api/types";

interface EndpointCellProps {
  partner: Partner;
  endpointKey: FinancialEndpointKey;
  endpoint?: PartnerEndpoint;
}

export function EndpointCell({ partner, endpointKey, endpoint }: EndpointCellProps) {
  const create = useCreatePartnerEndpoint();
  const remove = useDeletePartnerEndpoint();
  const detach = useDetachSchema();

  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [detachOpen, setDetachOpen] = React.useState(false);
  const [deactivateOpen, setDeactivateOpen] = React.useState(false);

  const endpointLabel = FinancialEndpointKeyLabel[endpointKey];
  const sheetTitle = `${partner.code} · ${endpointLabel}`;

  if (!endpoint) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1 text-muted-foreground"
        disabled={create.isPending}
        onClick={() =>
          create.mutate({ partnerId: partner.id, endpointKey })
        }
      >
        {create.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Plus className="h-3.5 w-3.5" />
        )}
        Activer
      </Button>
    );
  }

  const hasSchema = !!endpoint.schemaId;
  const schemaLabel =
    endpoint.schemaName ?? endpoint.schemaCode ?? endpoint.schemaId ?? "Schéma";

  return (
    <div className="flex min-w-[140px] flex-col gap-1.5 py-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="success">Active</Badge>
        {hasSchema ? (
          <span
            className="inline-flex max-w-[120px] truncate rounded-md bg-surface-muted px-2 py-0.5 text-xs font-medium"
            title={schemaLabel}
          >
            {schemaLabel}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Aucun schéma</span>
        )}
      </div>

      <div className="flex items-center gap-0.5">
        {!hasSchema && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setSheetOpen(true)}
          >
            <Link2 className="h-3 w-3" />
            Lier
          </Button>
        )}
        {hasSchema && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Actions endpoint">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setSheetOpen(true)}>
                Changer le schéma
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setDetachOpen(true)}>
                Détacher le schéma
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => setDeactivateOpen(true)}
              >
                Désactiver l&apos;endpoint
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {!hasSchema && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Actions endpoint">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => setDeactivateOpen(true)}
              >
                Désactiver l&apos;endpoint
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <SchemaAttachSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        endpointId={endpoint.id}
        title={hasSchema ? "Changer le schéma" : "Lier un schéma"}
        description={sheetTitle}
        initialSchemaId={endpoint.schemaId}
      />

      <Dialog open={detachOpen} onOpenChange={setDetachOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Détacher le schéma ?</DialogTitle>
            <DialogDescription>
              Le lien endpoint restera actif sans schéma comptable ({sheetTitle}).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDetachOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              disabled={detach.isPending}
              onClick={async () => {
                await detach.mutateAsync(endpoint.id);
                setDetachOpen(false);
              }}
            >
              {detach.isPending && <Loader2 className="animate-spin" />}
              Détacher
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Désactiver l&apos;endpoint ?</DialogTitle>
            <DialogDescription>
              Cette action supprime le lien {endpointLabel} pour {partner.name}. Un schéma
              rattaché sera également détaché.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeactivateOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={async () => {
                await remove.mutateAsync(endpoint.id);
                setDeactivateOpen(false);
              }}
            >
              {remove.isPending && <Loader2 className="animate-spin" />}
              Désactiver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
