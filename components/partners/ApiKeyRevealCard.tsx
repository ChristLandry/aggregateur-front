"use client";

import { Copy, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { notifySuccess } from "@/lib/api/notify";
import { toast } from "sonner";

interface ApiKeyRevealCardProps {
  apiKey: string;
  title?: string;
  description?: string;
  onDismiss?: () => void;
}

export function ApiKeyRevealCard({
  apiKey,
  title = "Clé API générée",
  description = "Copiez cette clé maintenant. Elle ne sera plus jamais ré-affichée par le serveur.",
  onDismiss,
}: ApiKeyRevealCardProps) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(apiKey);
      notifySuccess("Clé copiée dans le presse-papiers");
    } catch {
      toast.error("Impossible de copier la clé");
    }
  }

  return (
    <Card className="border-warning/40 bg-warning/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-warning">
          <AlertTriangle className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-border bg-surface-muted p-4 font-mono text-sm break-all">
          {apiKey}
        </div>
        <p className="text-xs font-medium text-destructive">
          Cette clé ne sera plus jamais ré-affichée. Conservez-la dans un coffre-fort
          sécurisé.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={copy}>
            <Copy className="h-4 w-4" />
            Copier
          </Button>
          {onDismiss && (
            <Button type="button" onClick={onDismiss}>
              J&apos;ai enregistré la clé
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
