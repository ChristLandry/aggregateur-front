"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { usePartner } from "@/hooks/usePartner";
import { useQueryClient } from "@tanstack/react-query";

export function PartnerSelector() {
  const [open, setOpen] = React.useState(false);
  const { partners, current, setPartnerId } = usePartner();
  const qc = useQueryClient();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          role="combobox"
          aria-expanded={open}
          className="min-w-[220px] justify-between"
        >
          <span className="flex items-center gap-2 truncate">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">
              {current ? current.name : "Sélectionner un partenaire"}
            </span>
          </span>
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="end">
        <Command>
          <CommandInput placeholder="Rechercher…" />
          <CommandList>
            <CommandEmpty>Aucun partenaire</CommandEmpty>
            <CommandGroup>
              {(partners ?? [])
                .filter((p): p is NonNullable<typeof p> => !!p)
                .map((p, idx) => {
                  const itemKey = p.id ?? `${p.code ?? "partner"}-${idx}`;
                  return (
                    <CommandItem
                      key={itemKey}
                      value={`${p.name ?? ""} ${p.code ?? ""} ${p.id ?? ""}`.trim()}
                      onSelect={() => {
                        if (!p.id) return;
                        setPartnerId(p.id);
                        setOpen(false);
                        // Invalidate partner-scoped queries.
                        qc.invalidateQueries({ queryKey: ["customers"] });
                        qc.invalidateQueries({ queryKey: ["subscriptions"] });
                        qc.invalidateQueries({ queryKey: ["dashboard"] });
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          current?.id === p.id ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="text-sm">{p.name ?? "(sans nom)"}</span>
                        <span className="text-xs text-muted-foreground">
                          {p.code ?? p.id ?? "—"}
                        </span>
                      </div>
                    </CommandItem>
                  );
                })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
