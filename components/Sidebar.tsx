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
  ArrowRightLeft,
  Grid3x3,
  FileBarChart,
  Activity,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
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
      { href: "/accounting/schemas", label: "Schémas", icon: BookOpen },
      { href: "/partner-endpoints", label: "Endpoints", icon: Grid3x3 },
      { href: "/accounting/transactions", label: "Transactions", icon: ArrowRightLeft },
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

/**
 * Sneat-style vertical menu.
 * Reference: scss/_components/_variables.scss
 *   $menu-width: 16.25rem (260px) / $menu-collapsed-width: 5.25rem (84px)
 *   $menu-hover-bg: gray-60 (#F2F3F3)
 *   $menu-active-bg: primary-bg-subtle
 *   $menu-active-color: primary
 */
export function Sidebar({
  collapsed,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex flex-col border-r border-border bg-surface shadow-xs transition-[width] duration-200",
        collapsed ? "w-[84px]" : "w-[260px]",
      )}
    >
      {/* Brand */}
      <div className="flex h-16 items-center gap-2.5 px-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Wallet className="h-5 w-5" />
        </div>
        {!collapsed && (
          <div className="flex flex-col leading-tight">
            <span className="text-[15px] font-semibold tracking-tight">Aggregator</span>
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Platform
            </span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-4 pb-3 pt-2">
        {NAV.map((section) => (
          <div key={section.label} className="mb-4 last:mb-0">
            {!collapsed && (
              <div className="px-3 pb-2 pt-3 label-section">{section.label}</div>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
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
                          active ? "text-primary" : "text-muted-foreground group-hover:text-card-foreground",
                        )}
                      />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

    </aside>
  );
}
