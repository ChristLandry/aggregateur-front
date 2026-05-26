"use client";

import * as React from "react";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { AuthGuard } from "@/components/AuthGuard";
import { cn } from "@/lib/utils";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background text-foreground">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        <div
          className={cn(
            "flex min-h-screen flex-col transition-[padding] duration-200",
            collapsed ? "lg:pl-[84px]" : "lg:pl-[260px]",
          )}
        >
          <Topbar onMenuClick={() => setCollapsed((c) => !c)} />
          <main className="flex-1 w-full animate-fade-in">
            <div className="mx-auto w-full max-w-[1440px] px-6 py-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
