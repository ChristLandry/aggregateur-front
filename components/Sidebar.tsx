"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  BookOpen,
  Grid3x3,
  FileBarChart,
  Activity,
  Wallet,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth/store";
import { ROLE_FINANCE_SET, hasRole } from "@/lib/auth/jwt";
import { PLATFORM_NAME } from "@/lib/branding";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  financeOnly?: boolean;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

const NAV: NavSection[] = [
  {
    label: "Général",
    items: [
      { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
    ],
  },
  {
    label: "Domaine",
    items: [
      { href: "/partners", label: "Partenaires", icon: Building2 },
      { href: "/customers", label: "Clients", icon: Users },
      { href: "/subscriptions", label: "Souscriptions", icon: CreditCard },
    ],
  },
  {
    label: "Comptabilité",
    items: [
      { href: "/accounting/schemas", label: "Schémas", icon: BookOpen, financeOnly: true },
      { href: "/partner-endpoints", label: "Endpoints", icon: Grid3x3, financeOnly: true },
      {
        href: "/transactions",
        label: "Transactions",
        icon: Receipt,
        financeOnly: true,
      },
    ],
  },
  {
    label: "Outils",
    items: [
      { href: "/reports", label: "Rapports", icon: FileBarChart },
      { href: "/system", label: "Système", icon: Activity },
    ],
  },
];

export function Sidebar({
  collapsed,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const role = useAuthStore((s) => s.user?.role ?? null);
  const canFinance = hasRole(role, ROLE_FINANCE_SET);

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex flex-col border-r border-border bg-surface shadow-xs transition-[width] duration-200",
        collapsed ? "w-[84px]" : "w-[260px]",
      )}
    >
      <div className="flex h-16 items-center gap-2.5 px-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Wallet className="h-5 w-5" />
        </div>
        {!collapsed && (
          <div className="flex flex-col leading-tight">
            <span className="text-[15px] font-semibold tracking-tight">{PLATFORM_NAME}</span>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-4 pb-3 pt-2">
        {NAV.map((section) => {
          const items = section.items.filter(
            (item) => !item.financeOnly || canFinance,
          );
          if (items.length === 0) return null;
          return (
            <div key={section.label} className="mb-4 last:mb-0">
              {!collapsed && (
                <div className="px-3 pb-2 pt-3 label-section">{section.label}</div>
              )}
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  const active =
                    pathname === item.href || pathname?.startsWith(item.href + "/");
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          "group flex items-center gap-3 rounded-md px-3.5 py-2 text-[0.9375rem] font-normal text-card-foreground transition-colors",
                          "hover:bg-surface-muted",
                          active &&
                            "bg-primary/12 text-primary font-medium hover:bg-primary/15 shadow-xs",
                          collapsed && "justify-center px-2",
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-[18px] w-[18px] shrink-0 transition-colors",
                            active
                              ? "text-primary"
                              : "text-muted-foreground group-hover:text-card-foreground",
                          )}
                        />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
