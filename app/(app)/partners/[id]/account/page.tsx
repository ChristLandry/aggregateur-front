"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePartnerAccount, usePartner } from "@/lib/api/partners";
import { formatCurrency, formatNumber } from "@/lib/utils";

export default function PartnerAccountPage() {
  const { id } = useParams<{ id: string }>();
  const { data: partner } = usePartner(id);
  const { data: account, isLoading } = usePartnerAccount(id);

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-3">
        <Link href={`/partners/${id}`}>
          <ChevronLeft /> Retour
        </Link>
      </Button>

      <PageHeader
        title={`Compte miroir — ${partner?.name ?? ""}`}
        description="Vue agrégée du compte miroir du partenaire."
      />

      {isLoading || !account ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-small label-section">Compte</CardTitle>
            </CardHeader>
            <CardContent className="font-mono text-h2">{account.accountCode}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-small label-section">Solde</CardTitle>
            </CardHeader>
            <CardContent className="font-mono text-h2">
              {formatCurrency(account.balance, account.currency)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-small label-section">Total débit</CardTitle>
            </CardHeader>
            <CardContent className="font-mono text-h2 text-destructive">
              {formatCurrency(account.totalDebit, account.currency)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-small label-section">Total crédit</CardTitle>
            </CardHeader>
            <CardContent className="font-mono text-h2 text-success">
              {formatCurrency(account.totalCredit, account.currency)}
            </CardContent>
          </Card>
          {account.movementsCount !== undefined && (
            <Card>
              <CardHeader>
                <CardTitle className="text-small label-section">Mouvements</CardTitle>
              </CardHeader>
              <CardContent className="font-mono text-h2">
                {formatNumber(account.movementsCount)}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
