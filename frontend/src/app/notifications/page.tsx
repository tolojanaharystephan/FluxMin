"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bell,
  Mail,
  Forward,
  Archive,
  CheckCircle2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CheckCheck,
  MessageSquare,
  Filter,
  Newspaper,
  Landmark,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { notificationHref, useNotifications } from "@/lib/use-notifications";

const typeConfig: Record<string, { icon: any; color: string; label: string }> = {
  courrier_recu: { icon: Mail, color: "text-sky-400", label: "Courrier reçu" },
  courrier_transmis: { icon: Forward, color: "text-amber-400", label: "Transmission" },
  courrier_acuse: { icon: CheckCircle2, color: "text-emerald-400", label: "Accusé" },
  courrier_archive: { icon: Archive, color: "text-zinc-400", label: "Archivage" },
  message_discussion: { icon: MessageSquare, color: "text-teal-400", label: "Message" },
  publication_gouv: { icon: Newspaper, color: "text-fuchsia-400", label: "Actualité gouv." },
  publication_ar: { icon: CheckCircle2, color: "text-pink-400", label: "AR publication" },
  publication_message: { icon: Landmark, color: "text-rose-300", label: "Réponse gouv." },
  courrier_relance: { icon: RefreshCw, color: "text-amber-400", label: "Relance auto" },
  courrier_escalade: { icon: Forward, color: "text-orange-400", label: "Escalade auto" },
};

interface Notification {
  id: number;
  type: string;
  titre: string;
  message: string | null;
  courrierId: number | null;
  publicationId: number | null;
  lu: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const { refetchUnread } = useNotifications();
  const queryClient = useQueryClient();
  const [page, setPage] = React.useState(1);
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [unreadOnly, setUnreadOnly] = React.useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["notifications", page, typeFilter, unreadOnly],
    queryFn: () =>
      api.getNotifications(accessToken!, page, 20, {
        type: typeFilter !== "all" ? typeFilter : undefined,
        unreadOnly,
      }),
    enabled: !!accessToken,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => api.markNotificationRead(accessToken!, id),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await refetchUnread();
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api.markAllNotificationsRead(accessToken!),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await refetchUnread();
    },
  });

  const notifications: Notification[] = (data as any)?.data || [];
  const pagination = (data as any)?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleClick = async (n: Notification) => {
    if (!n.lu) {
      try {
        await markReadMutation.mutateAsync(n.id);
      } catch {
        /* navigation anyway */
      }
    }
    const href = notificationHref(n);
    if (href) router.push(href);
  };

  return (
    <AuthGuard>
      <AppShell>
        <div className="flex flex-col gap-6 animate-fade-in">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-[-0.02em] flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15">
                  <Bell className="h-5 w-5 text-sky-400" />
                </span>
                Notifications
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {pagination.total} notification(s)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                Tout marquer lu
              </Button>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
                Actualiser
              </Button>
            </div>
          </div>

          <Card className="border-white/10 bg-white/5">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <Select
                  value={typeFilter}
                  onValueChange={(v) => {
                    setTypeFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[200px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    <SelectItem value="publication_gouv">Actualités gouvernement</SelectItem>
                    <SelectItem value="publication_ar">AR publications</SelectItem>
                    <SelectItem value="publication_message">Réponses gouvernement</SelectItem>
                    <SelectItem value="message_discussion">Messages</SelectItem>
                    <SelectItem value="courrier_recu">Courriers reçus</SelectItem>
                    <SelectItem value="courrier_transmis">Transmissions</SelectItem>
                    <SelectItem value="courrier_acuse">Accusés</SelectItem>
                    <SelectItem value="courrier_archive">Archivages</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant={unreadOnly ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setUnreadOnly((u) => !u);
                    setPage(1);
                  }}
                >
                  Non lues uniquement
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-sm text-destructive">{(error as Error).message}</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
                    Réessayer
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {notifications.map((n) => {
                    const config = typeConfig[n.type] || {
                      icon: Bell,
                      color: "text-muted-foreground",
                      label: n.type,
                    };
                    const Icon = config.icon;
                    return (
                      <div
                        key={n.id}
                        className={`flex items-start gap-4 px-6 py-4 transition-colors hover:bg-white/5 cursor-pointer ${
                          !n.lu ? "bg-primary/5" : ""
                        }`}
                        onClick={() => handleClick(n)}
                      >
                        <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
                          <Icon className={`h-4 w-4 ${config.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`text-sm ${!n.lu ? "font-semibold" : "font-medium"}`}>
                              {n.titre}
                            </p>
                            {!n.lu && (
                              <span className="h-2 w-2 rounded-full bg-teal-500 shrink-0" />
                            )}
                            <span className="text-[10px] text-muted-foreground rounded-md border px-1.5 py-0.5">
                              {config.label}
                            </span>
                          </div>
                          {n.message && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {n.message}
                            </p>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {formatDate(n.createdAt)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {notifications.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p className="text-sm text-muted-foreground">Aucune notification</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {pagination.page} sur {pagination.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" /> Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Suivant <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </AppShell>
    </AuthGuard>
  );
}
