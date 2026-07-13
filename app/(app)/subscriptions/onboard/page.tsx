"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertTriangle, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OnboardForm } from "@/components/forms/OnboardForm";
import {
  OnboardStepper,
  ONBOARD_STEPS,
  initialOnboardStepStates,
  type OnboardStepId,
} from "@/components/subscriptions/OnboardStepper";
import {
  useOnboardCustomer,
  type OnboardCustomerResponse,
} from "@/lib/api/onboard";
import {
  KYC_FIELD_LABELS,
  parseKycMismatchFields,
  resolveOnboardErrorMessage,
} from "@/lib/api/onboard-errors";
import { listSubscriptions } from "@/lib/api/subscriptions";
import { ApiError } from "@/lib/api/client";
import type { OnboardFormValues } from "@/lib/schemas/onboard";

type Phase = "form" | "progress" | "success" | "error";

export default function SubscriptionOnboardPage() {
  const router = useRouter();
  const onboard = useOnboardCustomer();
  const [phase, setPhase] = React.useState<Phase>("form");
  const [currentStep, setCurrentStep] = React.useState<OnboardStepId>("kyc");
  const [stepStates, setStepStates] = React.useState(initialOnboardStepStates);
  const [result, setResult] = React.useState<OnboardCustomerResponse | null>(null);
  const [errorCode, setErrorCode] = React.useState<string | undefined>();
  const [errorMessage, setErrorMessage] = React.useState<string>("");
  const [mismatchFields, setMismatchFields] = React.useState<string[]>([]);
  const [lastValues, setLastValues] = React.useState<OnboardFormValues | null>(null);
  const timersRef = React.useRef<number[]>([]);

  React.useEffect(() => {
    return () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  function clearTimers() {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }

  function startProgressAnimation() {
    clearTimers();
    setStepStates({ kyc: "active", link: "pending", persist: "pending" });
    setCurrentStep("kyc");
    timersRef.current.push(
      window.setTimeout(() => {
        setStepStates({ kyc: "done", link: "active", persist: "pending" });
        setCurrentStep("link");
      }, 2800),
    );
    timersRef.current.push(
      window.setTimeout(() => {
        setStepStates({ kyc: "done", link: "done", persist: "active" });
        setCurrentStep("persist");
      }, 5500),
    );
  }

  function failAtCurrentStep(code?: string) {
    clearTimers();
    const failStep: OnboardStepId =
      code === "BANK_KYC_FAILED" ||
      code === "WALLET_KYC_FAILED" ||
      code === "KYC_MISMATCH"
        ? "kyc"
        : code === "WALLET_LINK_FAILED"
          ? "link"
          : "persist";
    setCurrentStep(failStep);
    setStepStates((prev) => {
      const next = { ...prev };
      for (const s of ONBOARD_STEPS) {
        if (s.id === failStep) next[s.id] = "error";
        else if (ONBOARD_STEPS.findIndex((x) => x.id === s.id) < ONBOARD_STEPS.findIndex((x) => x.id === failStep)) {
          next[s.id] = "done";
        } else {
          next[s.id] = "pending";
        }
      }
      return next;
    });
  }

  async function handleDuplicateRedirect(values: OnboardFormValues) {
    try {
      const rows = await listSubscriptions({
        partnerScope: values.partnerId,
        bankAccountNumber: values.bankAccount,
        phoneNumber: values.phoneNumber,
        take: 5,
      });
      const existing = rows[0];
      if (existing?.id) {
        router.push(`/subscriptions/${existing.id}`);
        return;
      }
    } catch {
      /* ignore — show error panel */
    }
    setPhase("error");
  }

  async function handleSubmit(values: OnboardFormValues) {
    setLastValues(values);
    setResult(null);
    setErrorCode(undefined);
    setErrorMessage("");
    setMismatchFields([]);
    setPhase("progress");
    startProgressAnimation();

    try {
      const data = await onboard.mutateAsync(values);
      clearTimers();
      setStepStates({ kyc: "done", link: "done", persist: "done" });
      setCurrentStep("persist");
      setResult(data);
      setPhase("success");
    } catch (err) {
      const code = err instanceof ApiError ? err.code : undefined;
      const message = resolveOnboardErrorMessage(err);
      setErrorCode(code);
      setErrorMessage(message);

      if (code === "SUBSCRIPTION_DUPLICATE") {
        failAtCurrentStep(code);
        await handleDuplicateRedirect(values);
        return;
      }

      if (code === "KYC_MISMATCH") {
        setMismatchFields(
          parseKycMismatchFields(err instanceof ApiError ? err.message : message),
        );
      }

      failAtCurrentStep(code);
      setPhase("error");
    }
  }

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-3">
        <Link href="/subscriptions">
          <ChevronLeft /> Retour
        </Link>
      </Button>

      <PageHeader
        title="Onboarding souscription"
        description="Vérification KYC banque + wallet, liaison, puis création Client / Customer / Subscription."
      />

      {phase === "form" && (
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Nouvelle souscription</CardTitle>
            <CardDescription>
              Saisissez les 5 champs. Le flux backend enchaîne KYC, liaison wallet
              et enregistrement (jusqu&apos;à ~10 s).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OnboardForm
              loading={onboard.isPending}
              onCancel={() => router.push("/subscriptions")}
              onSubmit={handleSubmit}
            />
          </CardContent>
        </Card>
      )}

      {phase === "progress" && (
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Traitement en cours</CardTitle>
            <CardDescription>
              Ne fermez pas cette page. Les appels KYC et liaison peuvent prendre
              plusieurs secondes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OnboardStepper current={currentStep} states={stepStates} />
          </CardContent>
        </Card>
      )}

      {phase === "success" && result && (
        <Card className="max-w-xl border-success/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-success">
              <CheckCircle2 className="h-5 w-5" />
              Onboarding réussi
            </CardTitle>
            <CardDescription>
              Client racine, customer partenaire et souscription créés.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">ClientId</dt>
                <dd className="font-mono text-xs break-all">{result.clientId}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">CustomerId</dt>
                <dd className="font-mono text-xs break-all">{result.customerId}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">SubscriptionId</dt>
                <dd className="font-mono text-xs break-all">{result.subscriptionId}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">LinkId</dt>
                <dd className="font-mono text-xs break-all">{result.linkId ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Statut</dt>
                <dd>
                  <Badge variant="success">{result.status}</Badge>
                </dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              <Button asChild>
                <Link href={`/subscriptions/${result.subscriptionId}`}>
                  Voir la souscription
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href={`/clients/${result.clientId}`}>Voir le client</Link>
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setPhase("form");
                  setResult(null);
                  setStepStates(initialOnboardStepStates());
                }}
              >
                Nouvelle souscription
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {phase === "error" && (
        <div className="grid max-w-2xl gap-4 lg:grid-cols-[1fr_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Progression</CardTitle>
            </CardHeader>
            <CardContent>
              <OnboardStepper current={currentStep} states={stepStates} />
            </CardContent>
          </Card>
          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Échec de l&apos;onboarding
              </CardTitle>
              <CardDescription>
                {errorCode ? (
                  <code className="font-mono text-xs">{errorCode}</code>
                ) : (
                  "Erreur"
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">{errorMessage}</p>
              {errorCode === "KYC_MISMATCH" && mismatchFields.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Champs en désaccord
                  </p>
                  <ul className="flex flex-wrap gap-2">
                    {mismatchFields.map((f) => (
                      <Badge key={f} variant="danger">
                        {KYC_FIELD_LABELS[f] ?? f}
                      </Badge>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                <Button
                  onClick={() => {
                    setPhase("form");
                    setStepStates(initialOnboardStepStates());
                  }}
                >
                  Corriger et réessayer
                </Button>
                {lastValues && errorCode === "SUBSCRIPTION_DUPLICATE" && (
                  <Button
                    variant="secondary"
                    onClick={() => handleDuplicateRedirect(lastValues)}
                  >
                    Ouvrir la souscription existante
                  </Button>
                )}
                <Button asChild variant="ghost">
                  <Link href="/subscriptions">Retour à la liste</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
