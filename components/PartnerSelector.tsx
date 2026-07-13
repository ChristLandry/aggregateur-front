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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePartner } from "@/hooks/usePartner";
import { subscribePartnerSelectorOpen } from "@/lib/partner/selector-events";
import { useQueryClient } from "@tanstack/react-query";

export function PartnerSelector() {
  const [open, setOpen] = React.useState(false);
  const { partners, currentPartner, selectPartner, clearPartner, getApiKey } =
    usePartner();
  const qc = useQueryClient();

  React.useEffect(() => {
    const cp = currentPartner;
    if (cp && !getApiKey(cp.partnerId)) {
      clearPartner();
    }
  }, [currentPartner, getApiKey, clearPartner]);

  React.useEffect(() => subscribePartnerSelectorOpen(() => setOpen(true)), []);

  const label = currentPartner
    ? `${currentPartner.partnerCode}`
    : "Aucun partenaire";

  return (
    <TooltipProvider delayDuration={200}>
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
              <span className="truncate">{label}</span>
            </span>
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="end">
          <Command>
            <CommandInput placeholder="Rechercher…" />
            <CommandList>
              <CommandEmpty>Aucun résultat</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="__none__ aucun partenaire"
                  onSelect={() => {
                    clearPartner();
                    setOpen(false);
                    qc.invalidateQueries({ queryKey: ["clients"] });
                    qc.invalidateQueries({ queryKey: ["subscriptions"] });
                    qc.invalidateQueries({ queryKey: ["dashboard"] });
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      !currentPartner ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="text-muted-foreground">Aucun partenaire</span>
                </CommandItem>
                {(partners ?? [])
                  .filter((p): p is NonNullable<typeof p> => !!p?.id)
                  .map((p, idx) => {
                    const hasKey = !!getApiKey(p.id);
                    const itemKey = p.id ?? `${p.code ?? "partner"}-${idx}`;
                    const content = (
                      <CommandItem
                        key={itemKey}
                        value={`${p.name ?? ""} ${p.code ?? ""} ${p.id ?? ""}`.trim()}
                        disabled={!hasKey}
                        onSelect={() => {
                          if (!hasKey || !p.id) return;
                          selectPartner(p.id);
                          setOpen(false);
                          qc.invalidateQueries({ queryKey: ["clients"] });
                          qc.invalidateQueries({ queryKey: ["subscriptions"] });
                          qc.invalidateQueries({ queryKey: ["dashboard"] });
                        }}
                        className={cn(!hasKey && "opacity-50")}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            currentPartner?.partnerId === p.id ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <div className="flex flex-col">
                          <span className="text-sm">{p.name ?? "(sans nom)"}</span>
                          <span className="text-xs text-muted-foreground">
                            {p.code ?? p.id ?? "—"}
                            {!hasKey && " · clé requise"}
                          </span>
                        </div>
                      </CommandItem>
                    );

                    if (!hasKey) {
                      return (
                        <Tooltip key={itemKey}>
                          <TooltipTrigger asChild>
                            <div>{content}</div>
                          </TooltipTrigger>
                          <TooltipContent side="left">
                            Rotation de clé requise
                          </TooltipContent>
                        </Tooltip>
                      );
                    }
                    return content;
                  })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
}
