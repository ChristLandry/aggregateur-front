"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { LogOut, Menu, Settings, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PartnerSelector } from "@/components/PartnerSelector";
import { useAuthStore } from "@/lib/auth/store";
import { usePartnerStore } from "@/lib/partner/store";
import { useRole } from "@/hooks/useRole";
import { useLogout } from "@/lib/api/auth";
import { UserRoleLabel } from "@/lib/enums";

function humanizeSegment(segment: string): string {
  const map: Record<string, string> = {
    dashboard: "Tableau de bord",
    partners: "Partenaires",
    customers: "Clients",
    subscriptions: "Souscriptions",
    accounting: "Comptabilité",
    schemas: "Schémas",
    movements: "Transactions",
    transactions: "Transactions",
    reports: "Rapports",
    system: "Système",
    account: "Compte",
    sandbox: "Simulateur",
    playground: "Bac à sable",
    compare: "Comparaison",
  };
  return map[segment] ?? segment;
}

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname() ?? "";
  const segments = pathname.split("/").filter(Boolean);
  const user = useAuthStore((s) => s.user);
  const expiresAt = useAuthStore((s) => s.expiresAt);
  const currentPartner = usePartnerStore((s) => s.currentPartner);
  const { canSelectPartner } = useRole();
  const logout = useLogout();
  const [profileOpen, setProfileOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between bg-surface px-6 shadow-xs">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onMenuClick}
          aria-label="Menu"
          className="lg:hidden"
        >
          <Menu />
        </Button>
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          {segments.map((s, i) => (
            <React.Fragment key={s + i}>
              {i > 0 && <span>/</span>}
              <span
                className={
                  i === segments.length - 1 ? "font-medium text-foreground" : ""
                }
              >
                {humanizeSegment(s)}
              </span>
            </React.Fragment>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        {canSelectPartner && <PartnerSelector />}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <Avatar>
                <AvatarFallback>
                  {(user?.username ?? "?").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{user?.username ?? "Compte"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setProfileOpen(true)}>
              <UserCircle2 /> Profil
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings /> Paramètres
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => logout.mutate()}
              className="text-destructive focus:text-destructive"
            >
              <LogOut /> Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Profil connecté</DialogTitle>
            <DialogDescription>
              Informations de la session active.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 text-sm">
            <div><span className="text-muted-foreground">Utilisateur :</span> {user?.username ?? "—"}</div>
            <div><span className="text-muted-foreground">Email :</span> {user?.email ?? "—"}</div>
            <div>
              <span className="text-muted-foreground">Rôle :</span>{" "}
              {user?.role !== null && user?.role !== undefined ? UserRoleLabel[user.role] : "—"}
            </div>
            <div><span className="text-muted-foreground">User ID :</span> <span className="font-mono text-xs">{user?.id ?? "—"}</span></div>
            {canSelectPartner && (
              <div>
                <span className="text-muted-foreground">Partenaire actif :</span>{" "}
                {currentPartner
                  ? `${currentPartner.partnerCode} (${currentPartner.partnerId})`
                  : "—"}
              </div>
            )}
            <div><span className="text-muted-foreground">Expire le :</span> {expiresAt ?? "—"}</div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setProfileOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
