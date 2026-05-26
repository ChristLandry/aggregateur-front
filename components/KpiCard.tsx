"use client";

import * as React from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  delta?: number; // e.g. 0.12 = +12%
  icon?: React.ComponentType<{ className?: string }>;
  sparkline?: number[];
}

export function KpiCard({ label, value, delta, icon: Icon, sparkline }: KpiCardProps) {
  const positive = (delta ?? 0) >= 0;
  return (
    <Card className="p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="text-[13px] font-medium text-muted-foreground">{label}</div>
          <div className="text-[1.75rem] leading-9 font-semibold tracking-tight text-foreground font-mono">
            {value}
          </div>
          {delta !== undefined && (
            <div
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-medium w-fit",
                positive
                  ? "bg-success/12 text-success"
                  : "bg-destructive/12 text-destructive",
              )}
            >
              {positive ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {(delta * 100).toFixed(1)}%
            </div>
          )}
        </div>
        {Icon && (
          <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-md bg-primary/12 text-primary">
            <Icon className="h-[22px] w-[22px]" />
          </div>
        )}
      </div>
      {sparkline && sparkline.length > 1 && <Sparkline values={sparkline} />}
    </Card>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const w = 100;
  const h = 40;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = Math.max(1, max - min);
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / span) * h;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  const area = `0,${h} ${points} ${w},${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-4 h-10 w-full">
      <polygon points={area} fill="hsl(var(--accent) / 0.12)" />
      <polyline
        points={points}
        fill="none"
        stroke="hsl(var(--accent))"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
