"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/auth/store";
import { isTokenExpired } from "@/lib/auth/jwt";
import { Skeleton } from "@/components/ui/skeleton";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    // wait one tick to let zustand-persist hydrate
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    if (!accessToken && !refreshToken) {
      const next = pathname && pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";
      router.replace(`/login${next}`);
      return;
    }
    if (isTokenExpired(accessToken) && !refreshToken) {
      router.replace("/login");
    }
  }, [hydrated, accessToken, refreshToken, pathname, router]);

  if (!hydrated || !accessToken) {
    return (
      <div className="p-6 space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return <>{children}</>;
}

export function RoleGuard({
  allow,
  children,
}: {
  allow: (role: number | null) => boolean;
  children: React.ReactNode;
}) {
  const role = useAuthStore((s) => s.user?.role ?? null);
  if (!allow(role)) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="text-display text-destructive">403</div>
          <p className="text-muted-foreground mt-2">
            Vous n&apos;avez pas accès à cette ressource.
          </p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
