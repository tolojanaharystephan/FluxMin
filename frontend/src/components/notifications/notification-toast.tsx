"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Mail,
  Forward,
  Archive,
  CheckCircle2,
  MessageSquare,
  Newspaper,
  Landmark,
  X,
} from "lucide-react";
import { notificationHref, useNotifications } from "@/lib/use-notifications";
import { useAuthStore } from "@/lib/auth-store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const typeConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  courrier_recu: { icon: Mail, color: "text-sky-400", bg: "bg-sky-500/15" },
  courrier_transmis: { icon: Forward, color: "text-amber-400", bg: "bg-amber-500/15" },
  courrier_acuse: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/15" },
  courrier_archive: { icon: Archive, color: "text-zinc-400", bg: "bg-zinc-500/15" },
  message_discussion: { icon: MessageSquare, color: "text-teal-400", bg: "bg-teal-500/15" },
  publication_gouv: { icon: Newspaper, color: "text-fuchsia-400", bg: "bg-fuchsia-500/15" },
  publication_ar: { icon: CheckCircle2, color: "text-pink-400", bg: "bg-pink-500/15" },
  publication_message: { icon: Landmark, color: "text-rose-300", bg: "bg-rose-500/15" },
};

const AUTO_DISMISS_MS = 8000;

export function NotificationToast() {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const { latestNotification, dismissToast, refetchUnread } = useNotifications();

  useEffect(() => {
    if (!latestNotification) return;
    const t = setTimeout(dismissToast, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [latestNotification, dismissToast]);

  if (!latestNotification) return null;

  const n = latestNotification;
  const config = typeConfig[n.type] || {
    icon: Bell,
    color: "text-muted-foreground",
    bg: "bg-secondary",
  };
  const Icon = config.icon;

  const open = async () => {
    if (accessToken && n.id) {
      try {
        await api.markNotificationRead(accessToken, n.id);
        await refetchUnread();
      } catch {
        /* ignore */
      }
    }
    dismissToast();
    const href = notificationHref(n);
    router.push(href || "/notifications");
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] w-full max-w-sm animate-fade-in">
      <div
        className={cn(
          "flex w-full items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-xl",
          "ring-1 ring-black/5"
        )}
      >
        <button
          type="button"
          onClick={open}
          className="flex min-w-0 flex-1 items-start gap-3 text-left hover:opacity-90"
        >
          <span className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", config.bg)}>
            <Icon className={cn("h-4 w-4", config.color)} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold leading-snug">{n.titre}</span>
            {n.message && (
              <span className="mt-0.5 block text-xs text-muted-foreground line-clamp-2">
                {n.message}
              </span>
            )}
            <span className="mt-1.5 block text-[10px] font-medium text-teal-400">
              Cliquer pour ouvrir
            </span>
          </span>
        </button>
        <button
          type="button"
          aria-label="Fermer"
          className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          onClick={dismissToast}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
