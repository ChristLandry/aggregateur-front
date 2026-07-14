"use client";

import { Check, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type OnboardStepId = "kyc" | "link" | "persist";

export type OnboardStepState = "pending" | "active" | "done" | "error";

export const ONBOARD_STEPS: { id: OnboardStepId; label: string }[] = [
  { id: "kyc", label: "Vérification KYC" },
  { id: "link", label: "Liaison wallet" },
  { id: "persist", label: "Enregistrement" },
];

interface OnboardStepperProps {
  current: OnboardStepId;
  states: Record<OnboardStepId, OnboardStepState>;
}

export function OnboardStepper({ current, states }: OnboardStepperProps) {
  return (
    <ol className="space-y-3">
      {ONBOARD_STEPS.map((step, index) => {
        const state = states[step.id];
        const isCurrent = step.id === current;
        return (
          <li
            key={step.id}
            className={cn(
              "flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm transition-colors",
              state === "active" && "border-primary/40 bg-primary/5",
              state === "done" && "border-success/30 bg-success/5",
              state === "error" && "border-destructive/40 bg-destructive/5",
              state === "pending" && "border-border bg-surface-muted/40",
            )}
          >
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                state === "active" && "bg-primary text-primary-foreground",
                state === "done" && "bg-success text-success-foreground",
                state === "error" && "bg-destructive text-destructive-foreground",
                state === "pending" && "bg-muted text-muted-foreground",
              )}
            >
              {state === "done" ? (
                <Check className="h-4 w-4" />
              ) : state === "error" ? (
                <X className="h-4 w-4" />
              ) : state === "active" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                index + 1
              )}
            </span>
            <div className="flex flex-col">
              <span
                className={cn(
                  "font-medium",
                  isCurrent && state === "active" && "text-primary",
                  state === "error" && "text-destructive",
                )}
              >
                {step.label}
              </span>
              {state === "active" && (
                <span className="text-xs text-muted-foreground">
                  En cours… (jusqu&apos;à ~2 min)
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function initialOnboardStepStates(): Record<OnboardStepId, OnboardStepState> {
  return { kyc: "pending", link: "pending", persist: "pending" };
}
