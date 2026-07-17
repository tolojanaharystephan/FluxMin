"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { AuthGuard } from "@/components/auth/auth-guard";
import { RBACGuard } from "@/components/auth/rbac-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth-store";
import { api } from "@/lib/api";
import {
  BarChart3,
  Clock,
  Mail,
  Archive,
  FileText,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

function formatNumber(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n);
}

export default function AnalyticsPage() {
  const { accessToken } = useAuthStore();

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["stats", "analytics"],
    queryFn: () => api.getAnalyticsStats(accessToken!, 6),
    enabled: !!accessToken,
  });

  const analytics = data as any;
  const summary = analytics?.summary;
  const monthlyData: Array<{ month: string; courriers: number; traites: number }> =
    analytics?.monthly || [];
  const topDirections: Array<{ name: string; courriers: number; pourcentage: number }> =
    analytics?.topDirections || [];

  const maxBar = Math.max(1, ...monthlyData.map((d) => Math.max(d.courriers, d.traites)));

  const stats = [
    {
      title: "Total courriers",
      value: summary?.total ?? 0,
      icon: Mail,
      color: "text-info",
    },
    {
      title: "Courriers traités",
      value: summary?.traites ?? 0,
      icon: FileText,
      color: "text-success",
    },
    {
      title: "En attente",
      value: summary?.enAttente ?? 0,
      icon: Clock,
      color: "text-warning",
    },
    {
      title: "Archivés",
      value: summary?.archives ?? 0,
      icon: Archive,
      color: "text-primary",
    },
  ];

  return (
    <AuthGuard>
      <RBACGuard allowedRoles={["super_admin", "admin_ministere", "responsable", "responsable_direction", "auditeur"]}>
        <AppShell>
          <div className="flex flex-col gap-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
                  <BarChart3 className="h-6 w-6 text-info" />
                  Analytics
                </h1>
                <p className="text-sm text-muted-foreground">
                  Flux de courriers sur les 6 derniers mois (données réelles)
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
                Actualiser
              </Button>
            </div>

            {error && (
              <Card className="border-destructive/40">
                <CardContent className="p-4 text-sm text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Impossible de charger les analytics.
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat, i) => (
                <Card key={stat.title} className="animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
                        <stat.icon className={`h-5 w-5 ${stat.color}`} />
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-2xl font-bold">
                        {isLoading ? "…" : formatNumber(stat.value)}
                      </p>
                      <p className="text-xs text-muted-foreground">{stat.title}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Évolution mensuelle</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading && (
                    <p className="text-sm text-muted-foreground text-center py-16">Chargement...</p>
                  )}
                  {!isLoading && monthlyData.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-16">Pas encore de données.</p>
                  )}
                  {!isLoading && monthlyData.length > 0 && (
                    <>
                      <div className="flex items-end gap-3 h-48">
                        {monthlyData.map((data) => (
                          <div key={data.month} className="flex flex-col items-center gap-2 flex-1">
                            <div className="w-full flex gap-1 items-end justify-center" style={{ height: "140px" }}>
                              <div
                                className="w-4 rounded-t bg-info/60"
                                style={{ height: `${(data.courriers / maxBar) * 100}%` }}
                                title={`${data.courriers} créés`}
                              />
                              <div
                                className="w-4 rounded-t bg-success/60"
                                style={{ height: `${(data.traites / maxBar) * 100}%` }}
                                title={`${data.traites} traités`}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground">{data.month}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded bg-info/60" />
                          <span>Créés</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded bg-success/60" />
                          <span>Traités</span>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top directions destinataires</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading && (
                    <p className="text-sm text-muted-foreground text-center py-8">Chargement...</p>
                  )}
                  {!isLoading && topDirections.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Aucune activité à afficher.
                    </p>
                  )}
                  <div className="flex flex-col gap-4">
                    {topDirections.map((dir, i) => (
                      <div key={dir.name} className="flex items-center gap-4">
                        <span className="text-sm font-medium text-muted-foreground w-6">{i + 1}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">{dir.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatNumber(dir.courriers)} · {dir.pourcentage}%
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-secondary">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${Math.min(100, dir.pourcentage)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </AppShell>
      </RBACGuard>
    </AuthGuard>
  );
}
