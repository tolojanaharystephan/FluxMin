"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { AuthGuard } from "@/components/auth/auth-guard";
import { RBACGuard } from "@/components/auth/rbac-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/lib/auth-store";
import { api } from "@/lib/api";
import {
  Mail,
  Send,
  Inbox,
  FileText,
  Clock,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Archive,
  Building2,
  Users,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Administrateur",
  admin_ministere: "Admin Ministère",
  agent_courrier: "Agent Courrier",
  responsable: "Responsable",
  responsable_direction: "Responsable Direction",
  auditeur: "Auditeur",
};

const statusConfig: Record<string, { label: string; variant: "default" | "success" | "warning" | "info" | "secondary" | "destructive" | "outline" }> = {
  en_traitement: { label: "En traitement", variant: "info" },
  recu: { label: "Reçu", variant: "success" },
  envoye: { label: "Envoyé", variant: "default" },
  brouillon: { label: "Brouillon", variant: "secondary" },
  archive: { label: "Archivé", variant: "outline" },
};

const KPI_ICONS: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  total: { icon: Mail, color: "text-info", bgColor: "bg-info/10" },
  ministeres: { icon: Building2, color: "text-success", bgColor: "bg-success/10" },
  utilisateurs: { icon: Users, color: "text-primary", bgColor: "bg-primary/10" },
  directions: { icon: Building2, color: "text-success", bgColor: "bg-success/10" },
  en_attente: { icon: Clock, color: "text-warning", bgColor: "bg-warning/10" },
  archive: { icon: Archive, color: "text-primary", bgColor: "bg-primary/10" },
  inbox: { icon: Inbox, color: "text-info", bgColor: "bg-info/10" },
  recu: { icon: CheckCircle2, color: "text-success", bgColor: "bg-success/10" },
  en_traitement: { icon: Clock, color: "text-warning", bgColor: "bg-warning/10" },
  sent: { icon: Send, color: "text-primary", bgColor: "bg-primary/10" },
  brouillon: { icon: FileText, color: "text-muted-foreground", bgColor: "bg-secondary" },
};

function formatRelative(dateStr: string) {
  const d = new Date(dateStr);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Il y a ${days}j`;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function formatNumber(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n);
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, accessToken } = useAuthStore();
  const userRole = user?.role || "responsable";
  const roleLabel = ROLE_LABELS[userRole] || userRole;

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["stats", "dashboard"],
    queryFn: () => api.getDashboardStats(accessToken!),
    enabled: !!accessToken,
  });

  const stats = data as any;
  const kpis = stats?.kpis || [];
  const recent = stats?.recent || [];
  const activity = stats?.activity || [];
  const performance = stats?.performance;

  return (
    <AuthGuard>
      <RBACGuard
        allowedRoles={["super_admin", "admin_ministere", "responsable", "responsable_direction", "agent_courrier"]}
      >
        <AppShell>
          <div className="flex flex-col gap-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  {userRole === "super_admin" && "Vue globale multi-ministères"}
                  {userRole === "admin_ministere" && "Dashboard Ministère"}
                  {userRole === "responsable" && "Dashboard Responsable"}
                  {userRole === "responsable_direction" && "Dashboard Direction"}
                  {userRole === "agent_courrier" && "Tableau de bord Agent"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {user?.ministereNom
                    ? `${roleLabel} · ${user.ministereNom}`
                    : roleLabel}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isFetching}>
                  <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                </Button>
                {userRole !== "super_admin" && (
                  <Button onClick={() => router.push("/courriers/new")}>
                    <FileText className="h-4 w-4" />
                    Nouveau courrier
                  </Button>
                )}
              </div>
            </div>

            {error && (
              <Card className="border-destructive/40">
                <CardContent className="p-4 text-sm text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Impossible de charger le tableau de bord. Réessayez.
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {isLoading &&
                Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6 h-28 animate-pulse bg-secondary/40 rounded-xl" />
                  </Card>
                ))}
              {!isLoading &&
                kpis.map((kpi: any, i: number) => {
                  const meta = KPI_ICONS[kpi.key] || KPI_ICONS.total;
                  const Icon = meta.icon;
                  return (
                    <Card key={kpi.key} className="animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${meta.bgColor}`}>
                            <Icon className={`h-5 w-5 ${meta.color}`} />
                          </div>
                          {kpi.changePct != null && (
                            <div
                              className={`flex items-center gap-1 text-xs font-medium ${
                                kpi.trend === "down" ? "text-destructive" : kpi.trend === "up" ? "text-success" : "text-muted-foreground"
                              }`}
                            >
                              {kpi.trend === "up" ? (
                                <ArrowUpRight className="h-3 w-3" />
                              ) : kpi.trend === "down" ? (
                                <ArrowDownRight className="h-3 w-3" />
                              ) : null}
                              {kpi.changePct > 0 ? "+" : ""}
                              {kpi.changePct}%
                            </div>
                          )}
                        </div>
                        <div className="mt-4">
                          <p className="text-2xl font-bold">{formatNumber(kpi.value)}</p>
                          <p className="text-xs text-muted-foreground">{kpi.label}</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                  <CardTitle className="text-base">Courriers récents</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => router.push(userRole === "super_admin" ? "/analytics" : "/inbox")}>
                    Voir tout
                    <ArrowUpRight className="h-3 w-3" />
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {isLoading && (
                    <p className="px-6 py-8 text-sm text-muted-foreground text-center">Chargement...</p>
                  )}
                  {!isLoading && recent.length === 0 && (
                    <p className="px-6 py-8 text-sm text-muted-foreground text-center">
                      Aucun courrier pour le moment.
                    </p>
                  )}
                  <div className="divide-y divide-border">
                    {recent.map((courrier: any) => (
                      <button
                        key={courrier.id}
                        type="button"
                        onClick={() => router.push(`/courriers/${courrier.id}`)}
                        className="flex w-full items-start gap-4 px-6 py-4 text-left transition-colors hover:bg-secondary/30"
                      >
                        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium">{courrier.objet}</p>
                          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-mono">{courrier.reference}</span>
                            <span>·</span>
                            <span>{courrier.emetteurNom}</span>
                            <span>·</span>
                            <span>{courrier.directionNom}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Badge variant={statusConfig[courrier.statut]?.variant ?? "default"}>
                            {statusConfig[courrier.statut]?.label ?? courrier.statut}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {formatRelative(courrier.createdAt)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-col gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Actions rapides</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    {userRole === "super_admin" ? (
                      <>
                        <Button variant="outline" className="justify-start" size="sm" asChild>
                          <Link href="/admin/utilisateurs">
                            <Users className="h-4 w-4" />
                            Gérer les utilisateurs
                          </Link>
                        </Button>
                        <Button variant="outline" className="justify-start" size="sm" asChild>
                          <Link href="/admin/ministeres">
                            <Building2 className="h-4 w-4" />
                            Ministères
                          </Link>
                        </Button>
                        <Button variant="outline" className="justify-start" size="sm" asChild>
                          <Link href="/analytics">
                            <TrendingUp className="h-4 w-4" />
                            Analytics
                          </Link>
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="outline" className="justify-start" size="sm" asChild>
                          <Link href="/inbox">
                            <Inbox className="h-4 w-4" />
                            Boîte de réception
                          </Link>
                        </Button>
                        <Button variant="outline" className="justify-start" size="sm" asChild>
                          <Link href="/courriers/new">
                            <FileText className="h-4 w-4" />
                            Nouveau courrier
                          </Link>
                        </Button>
                        <Button variant="outline" className="justify-start" size="sm" asChild>
                          <Link href="/archives">
                            <Archive className="h-4 w-4" />
                            Mes archives
                          </Link>
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Activité récente</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    {activity.length === 0 && (
                      <p className="text-xs text-muted-foreground">Aucune activité récente.</p>
                    )}
                    {activity.map((item: any, i: number) => (
                      <button
                        key={`${item.courrierId}-${i}`}
                        type="button"
                        className="flex items-center gap-3 text-left"
                        onClick={() => item.courrierId && router.push(`/courriers/${item.courrierId}`)}
                      >
                        <span className="font-mono text-[10px] text-muted-foreground w-10">
                          {formatTime(item.at)}
                        </span>
                        <Separator orientation="vertical" className="h-8" />
                        <div>
                          <p className="text-xs font-medium">{item.action}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{item.reference}</p>
                        </div>
                      </button>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <TrendingUp className="h-4 w-4 text-success" />
                      Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Temps moyen traitement</span>
                        <span className="font-medium">
                          {performance?.avgTraitementHours != null
                            ? `${performance.avgTraitementHours}h`
                            : "—"}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full bg-success"
                          style={{
                            width: `${performance?.avgTraitementHours != null
                              ? Math.min(100, Math.max(8, 100 - performance.avgTraitementHours * 5))
                              : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Taux d&apos;archivage</span>
                        <span className="font-medium">
                          {performance?.closureRate != null ? `${performance.closureRate}%` : "—"}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${performance?.closureRate ?? 0}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </AppShell>
      </RBACGuard>
    </AuthGuard>
  );
}
