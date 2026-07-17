"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { getDefaultHomePath } from "@/lib/home-path";

interface RBACGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  /** Si omis, redirection vers la home du rôle (évite les boucles). */
  fallbackPath?: string;
}

export function RBACGuard({
  children,
  allowedRoles,
  fallbackPath,
}: RBACGuardProps) {
  const { user } = useAuthStore();
  const router = useRouter();

  const userRole = user?.role || "responsable";
  const redirectTo = fallbackPath || getDefaultHomePath(userRole);
  const denied =
    !!allowedRoles &&
    allowedRoles.length > 0 &&
    !allowedRoles.includes(userRole);

  React.useEffect(() => {
    if (denied) {
      router.replace(redirectTo);
    }
  }, [denied, router, redirectTo]);

  if (denied) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <svg className="h-8 w-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold">Accès non autorisé</h2>
            <p className="text-sm text-muted-foreground">
              Vous n&apos;avez pas les permissions nécessaires pour accéder à cette page.
            </p>
          </div>
          <button
            onClick={() => router.push(redirectTo)}
            className="text-sm text-primary hover:underline"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
