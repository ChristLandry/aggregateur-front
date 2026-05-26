"use client";

import * as React from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useExportReport } from "@/lib/api/reports";
import { usePartners } from "@/lib/api/partners";
import {
  TransactionStatus,
  TransactionStatusLabel,
} from "@/lib/enums";
import type { ExportRequest } from "@/lib/api/types";

const REPORT_TYPES: { value: ExportRequest["reportType"]; label: string; description: string }[] = [
  { value: "transactions", label: "Transactions", description: "Liste des transactions sur la période." },
  { value: "subscriptions", label: "Souscriptions", description: "État des souscriptions." },
  { value: "failure-analysis", label: "Analyse des échecs", description: "Causes et fréquences des échecs." },
  { value: "accounting", label: "Comptabilité", description: "Synthèse comptable sur la période." },
  { value: "partner-account-statement", label: "Relevé partenaire", description: "Relevé de compte miroir d'un partenaire." },
];

export default function ReportsPage() {
  const { data: partners } = usePartners();
  const exportReport = useExportReport();
  const [reportType, setReportType] = React.useState<ExportRequest["reportType"]>("transactions");
  const [partnerId, setPartnerId] = React.useState<string>("");
  const [fromDate, setFromDate] = React.useState("");
  const [toDate, setToDate] = React.useState("");
  const [status, setStatus] = React.useState<string>("");

  function doExport(format: "csv" | "xlsx") {
    const body: ExportRequest = {
      reportType,
      format,
      ...(partnerId ? { partnerId } : {}),
      ...(fromDate ? { fromDate } : {}),
      ...(toDate ? { toDate } : {}),
    };
    void exportReport.mutate(body);
    // status only used by some report types — included in URL via dedicated hooks if needed.
    void status;
  }

  const requiresPartner = reportType === "partner-account-statement";
  const supportsStatus = reportType === "transactions" || reportType === "subscriptions";
  const supportsDates = reportType !== "subscriptions";

  return (
    <div>
      <PageHeader
        title="Rapports"
        description="Configurez puis exportez les rapports au format CSV ou Excel."
      />

      <Card>
        <CardHeader>
          <CardTitle>Configurer l&apos;export</CardTitle>
          <CardDescription>
            Les filtres dépendent du type de rapport sélectionné.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-1">
              <Label>Type de rapport</Label>
              <Select
                value={reportType}
                onValueChange={(v) => setReportType(v as ExportRequest["reportType"])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {REPORT_TYPES.find((r) => r.value === reportType)?.description}
              </p>
            </div>

            <div className="space-y-1">
              <Label>Partenaire {requiresPartner && <span className="text-destructive">*</span>}</Label>
              <Select value={partnerId} onValueChange={setPartnerId}>
                <SelectTrigger><SelectValue placeholder="Tous" /></SelectTrigger>
                <SelectContent>
                  {(partners ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {supportsStatus && (
              <div className="space-y-1">
                <Label>Statut</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue placeholder="Tous" /></SelectTrigger>
                  <SelectContent>
                    {Object.values(TransactionStatus)
                      .filter((v): v is TransactionStatus => typeof v === "number")
                      .map((s) => (
                        <SelectItem key={s} value={String(s)}>
                          {TransactionStatusLabel[s]}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {supportsDates && (
              <>
                <div className="space-y-1">
                  <Label>Du</Label>
                  <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Au</Label>
                  <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                </div>
              </>
            )}
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-2 pt-4 border-t border-border">
            <Button
              variant="secondary"
              onClick={() => doExport("csv")}
              disabled={(requiresPartner && !partnerId) || exportReport.isPending}
            >
              <FileText /> Export CSV
            </Button>
            <Button
              onClick={() => doExport("xlsx")}
              disabled={(requiresPartner && !partnerId) || exportReport.isPending}
            >
              <FileSpreadsheet /> Export Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-4 w-4" /> Astuce
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Pour visualiser les données avant export, utilisez les pages dédiées (Mouvements, Souscriptions, etc.).
          L&apos;export ici renvoie un fichier binaire téléchargé immédiatement.
        </CardContent>
      </Card>
    </div>
  );
}
