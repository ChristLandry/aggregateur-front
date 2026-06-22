"use client";

import * as React from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { loginSchema, type LoginFormValues } from "@/lib/schemas/auth";
import { useLogin } from "@/lib/api/auth";
import { useAuthStore } from "@/lib/auth/store";
import { PLATFORM_LOGIN_FOOTER, PLATFORM_NAME } from "@/lib/branding";

/**
 * Sneat-style auth page: centered paper card on a tinted page background,
 * brand block at the top, large heading, soft form spacing.
 *
 * In Next 15 `useSearchParams()` requires a Suspense boundary or the page
 * becomes 100% dynamic and breaks router prefetch ("Failed to fetch").
 * We isolate the search-params usage in a child component wrapped in
 * <Suspense>.
 */
export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Suspense fallback={<LoginSkeleton />}>
        <LoginCard />
      </Suspense>
    </div>
  );
}

function LoginCard() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search?.get("next") ?? "/dashboard";
  const accessToken = useAuthStore((s) => s.accessToken);

  React.useEffect(() => {
    if (accessToken) router.replace(next);
  }, [accessToken, next, router]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "", twoFactorCode: "" },
  });
  const login = useLogin();

  const onSubmit = form.handleSubmit(async (values) => {
    const payload: LoginFormValues = { ...values };
    if (!payload.twoFactorCode) delete payload.twoFactorCode;
    await login.mutateAsync(payload);
    router.replace(next);
  });

  return (
    <div className="w-full max-w-[440px] rounded-xl bg-surface p-8 shadow-lg sm:p-10">
      <div className="mb-6 flex items-center justify-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-primary">
          <Wallet className="h-6 w-6" />
        </div>
        <span className="text-[20px] font-semibold tracking-tight">{PLATFORM_NAME}</span>
      </div>

      <div className="mb-6 text-center">
        <h1 className="text-[22px] font-semibold leading-7">Bienvenue 👋</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connectez-vous pour accéder à votre espace de pilotage.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={onSubmit} className="space-y-5">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nom d&apos;utilisateur</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="username"
                    autoFocus
                    placeholder="ex. john.doe"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Mot de passe</FormLabel>
                  <button
                    type="button"
                    className="text-[12px] text-primary hover:underline"
                    onClick={(e) => e.preventDefault()}
                  >
                    Oublié&nbsp;?
                  </button>
                </div>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="twoFactorCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Code 2FA{" "}
                  <span className="font-normal text-muted-foreground">(optionnel)</span>
                </FormLabel>
                <FormControl>
                  <Input
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="123 456"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={login.isPending}
          >
            {login.isPending && <Loader2 className="animate-spin" />}
            Se connecter
          </Button>
        </form>
      </Form>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        {PLATFORM_LOGIN_FOOTER}
      </p>
    </div>
  );
}

function LoginSkeleton() {
  return (
    <div className="w-full max-w-[440px] rounded-xl bg-surface p-8 shadow-lg sm:p-10 space-y-4">
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-8 w-2/3 mx-auto" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}
