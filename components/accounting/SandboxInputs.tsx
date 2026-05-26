"use client";

import * as React from "react";
import { Play } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePartners, usePartnerAccount } from "@/lib/api/partners";
import { useSubscriptions } from "@/lib/api/subscriptions";
import type { SimulationContext } from "@/lib/accounting/simulator";

export interface SandboxInputsProps {
  value: SimulationContext;
  onChange: (next: SimulationContext) => void;
  txTypeLabel?: string;
  /** Déclenche la simulation (client-side). */
  onSimulate?: () => void;
  simulateDisabled?: boolean;
  simulating?: boolean;
}

export function SandboxInputs({
  value,
  onChange,
  txTypeLabel,
  onSimulate,
  simulateDisabled,
  simulating,
}: SandboxInputsProps) {
  const { data: partners } = usePartners();
  const partnerId = value.extras?.partnerId as string | undefined;
  const { data: partnerAccount } = usePartnerAccount(partnerId);
  const [customerId, setCustomerId] = React.useState(
    () => (value.extras?.customerId as string | undefined) ?? "",
  );
  const { data: subscriptions } = useSubscriptions(
    customerId.trim() ? customerId.trim() : null,
  );

  // Pré-remplir solde / compte depuis GET /partners/:id/account
  const lastAccountKey = React.useRef<string>("");
  React.useEffect(() => {
    if (!partnerAccount || !partnerId) return;
    const key = `${partnerId}:${partnerAccount.balance}:${partnerAccount.accountCode}`;
    if (lastAccountKey.current === key) return;
    lastAccountKey.current = key;
    onChange({
      ...value,
      PARTNER: {
        ...(value.PARTNER ?? {}),
        Balance: partnerAccount.balance,
        AccountCode: partnerAccount.accountCode,
        Currency: partnerAccount.currency,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerAccount, partnerId]);

  function patch(p: Partial<SimulationContext>) {
    onChange({ ...value, ...p });
  }
  function patchPartner(p: Partial<NonNullable<SimulationContext["PARTNER"]>>) {
    onChange({ ...value, PARTNER: { ...(value.PARTNER ?? {}), ...p } });
  }
  function patchCustomer(p: Partial<NonNullable<SimulationContext["CUSTOMER"]>>) {
    onChange({ ...value, CUSTOMER: { ...(value.CUSTOMER ?? {}), ...p } });
  }
  function patchExtras(p: Record<string, unknown>) {
    onChange({ ...value, extras: { ...(value.extras ?? {}), ...p } });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Transaction simulée</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Montant (AMOUNT)</Label>
            <Input
              type="number"
              min={0.01}
              step="0.01"
              value={value.AMOUNT}
              onChange={(e) => patch({ AMOUNT: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1">
            <Label>Devise (TX.Currency)</Label>
            <Input
              maxLength={3}
              value={value.currency ?? "XOF"}
              onChange={(e) => patch({ currency: e.target.value.toUpperCase() })}
            />
          </div>
          {txTypeLabel && (
            <div className="space-y-1">
              <Label>Type de transaction</Label>
              <Input value={txTypeLabel} disabled className="bg-surface-muted" />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contexte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Partenaire</Label>
            <Select
              value={partnerId ?? ""}
              onValueChange={(v) => {
                const p = partners?.find((x) => x.id === v);
                onChange({
                  ...value,
                  extras: { ...(value.extras ?? {}), partnerId: v },
                  PARTNER: {
                    Balance: p?.balance ?? value.PARTNER?.Balance ?? 0,
                    AccountCode: p?.accountCode ?? value.PARTNER?.AccountCode ?? "",
                    Currency: p?.currency ?? value.PARTNER?.Currency ?? "XOF",
                  },
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un partenaire…" />
              </SelectTrigger>
              <SelectContent>
                {(partners ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}{" "}
                    <span className="font-mono text-xs text-muted-foreground">({p.code})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Compte miroir (PARTNER.AccountCode)</Label>
              <Input
                className="font-mono text-xs"
                value={value.PARTNER?.AccountCode ?? ""}
                onChange={(e) => patchPartner({ AccountCode: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Solde (PARTNER.Balance)</Label>
              <Input
                type="number"
                step="0.01"
                value={value.PARTNER?.Balance ?? 0}
                onChange={(e) => patchPartner({ Balance: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>ID client (UUID, optionnel)</Label>
            <Input
              className="font-mono text-xs"
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                patchExtras({ customerId: e.target.value || undefined });
              }}
              placeholder="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
            />
          </div>

          {customerId.trim() && (
            <div className="space-y-1">
              <Label>Souscription</Label>
              <Select
                value={(value.extras?.subscriptionId as string | undefined) ?? ""}
                onValueChange={(v) => patchExtras({ subscriptionId: v || undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une souscription…" />
                </SelectTrigger>
                <SelectContent>
                  {(subscriptions ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="font-mono text-xs">{s.id.slice(0, 8)}…</span>
                      {s.phoneNumber && ` — ${s.phoneNumber}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <Label>Téléphone (CUSTOMER.PhoneNumber)</Label>
            <Input
              value={value.CUSTOMER?.PhoneNumber ?? ""}
              onChange={(e) => patchCustomer({ PhoneNumber: e.target.value })}
              placeholder="+2250700000000"
            />
          </div>
          <div className="space-y-1">
            <Label>Compte bancaire (CUSTOMER.BankAccount)</Label>
            <Input
              className="font-mono text-xs"
              value={value.CUSTOMER?.BankAccount ?? ""}
              onChange={(e) => patchCustomer({ BankAccount: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {onSimulate && (
        <Button
          className="w-full"
          size="lg"
          onClick={onSimulate}
          disabled={simulateDisabled || simulating}
        >
          <Play className={simulating ? "animate-pulse" : undefined} />
          Simuler
        </Button>
      )}
    </div>
  );
}
