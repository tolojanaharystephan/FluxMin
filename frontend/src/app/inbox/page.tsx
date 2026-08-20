"use client";

import React, { useState, useCallback, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { AuthGuard } from "@/components/auth/auth-guard";
import { RBACGuard } from "@/components/auth/rbac-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Inbox,
  Search,
  Filter,
  Mail,
  RefreshCw,
  Plus,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

const statusConfig: Record<string, { label: string; variant: "default" | "success" | "warning" | "info" | "secondary" | "destructive" | "outline" }> = {
  en_traitement: { label: "En traitement", variant: "info" },
  recu: { label: "Reçu", variant: "success" },
  envoye: { label: "Envoyé", variant: "default" },
  brouillon: { label: "Brouillon", variant: "secondary" },
  archive: { label: "Archivé", variant: "outline" },
};

interface AutoAnalyse {
  priorite: "haute" | "moyenne" | "basse";
  prioriteScore: number;
  objetPropose: string | null;
  analyseSource: "pj" | "text" | "none";
  analyzedAt: string;
}

interface Courrier {
  id: number;
  reference: string;
  objet: string;
  typeCourrier: string;
  statut: string;
  dateEnvoi: string | null;
  dateReception: string | null;
  createdAt: string;
  emetteurNom: string | null;
  directionEmetteurNom: string | null;
  metadata?: { autoAnalyse?: AutoAnalyse } | null;
}

function PrioriteBadge({ autoAnalyse }: { autoAnalyse?: AutoAnalyse }) {
  if (!autoAnalyse || autoAnalyse.priorite === "basse") return null;
  if (autoAnalyse.priorite === "haute") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-destructive/15 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
        <AlertCircle className="h-3 w-3" />
        URGENT
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
      <AlertTriangle className="h-3 w-3" />
      Priorité
    </span>
  );
}

function InboxContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accessToken } = useAuthStore();
  const initialQ = searchParams.get("q") || "";
  const [searchInput, setSearchInput] = useState(initialQ);
  const [appliedSearch, setAppliedSearch] = useState(initialQ);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const q = searchParams.get("q") || "";
    setSearchInput(q);
    setAppliedSearch(q);
    setPage(1);
  }, [searchParams]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["courriers", "inbox", appliedSearch, statusFilter, typeFilter, dateDebut, dateFin, page],
    queryFn: () => api.getCourriers(accessToken!, {
      search: appliedSearch || undefined,
      statut: statusFilter !== "all" ? statusFilter : undefined,
      typeCourrier: typeFilter !== "all" ? typeFilter : undefined,
      scope: appliedSearch ? "accessible" : undefined,
      dateDebut: dateDebut || undefined,
      dateFin: dateFin || undefined,
      page,
      limit: 20,
    }),
    enabled: !!accessToken,
  });

  const courriers: Courrier[] = (data as any)?.data || [];
  const pagination = (data as any)?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 };

  const applySearch = useCallback(() => {
    setAppliedSearch(searchInput.trim());
    setPage(1);
    const q = searchInput.trim();
    router.replace(q ? `/inbox?q=${encodeURIComponent(q)}` : "/inbox");
  }, [searchInput, router]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <AuthGuard>
      <RBACGuard
        allowedRoles={["agent_courrier", "responsable", "responsable_direction", "directeur_ministere"]}
      >
      <AppShell>
        <div className="flex flex-col gap-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-[-0.02em] flex items-center gap-3">
                <Inbox className="h-6 w-6 text-primary" />
                Boîte de réception
              </h1>
              <p className="text-sm text-muted-foreground">
                {pagination.total} courrier(s)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
                Actualiser
              </Button>
              <Button size="sm" onClick={() => router.push("/courriers/new")}>
                <Plus className="h-4 w-4" />
                Nouveau courrier
              </Button>
            </div>
          </div>

          <Card className="border-white/10 bg-white/5">
            <CardContent className="p-5">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher par référence, objet, contenu..."
                      className="pl-10 rounded-xl"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && applySearch()}
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                    <SelectTrigger className="w-[160px]">
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      <SelectItem value="recu">Reçu</SelectItem>
                      <SelectItem value="en_traitement">En traitement</SelectItem>
                      <SelectItem value="envoye">Envoyé</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les types</SelectItem>
                      <SelectItem value="interne">Interne</SelectItem>
                      <SelectItem value="externe">Externe</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={applySearch}>
                    Rechercher
                  </Button>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground">Du</label>
                    <Input type="date" className="w-[160px]" value={dateDebut} onChange={(e) => { setDateDebut(e.target.value); setPage(1); }} />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground">Au</label>
                    <Input type="date" className="w-[160px]" value={dateFin} onChange={(e) => { setDateFin(e.target.value); setPage(1); }} />
                  </div>
                  {(dateDebut || dateFin) && (
                    <Button variant="ghost" size="sm" onClick={() => { setDateDebut(""); setDateFin(""); setPage(1); }}>
                      Effacer dates
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Courriers ({pagination.total})
              </CardTitle>
            </CardHeader>
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
                  {courriers.map((courrier) => (
                    <div
                      key={courrier.id}
                      className="flex items-start gap-4 px-6 py-4 transition-colors hover:bg-white/5 cursor-pointer"
                      onClick={() => router.push(`/courriers/${courrier.id}`)}
                    >
                      <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ${
                        courrier.metadata?.autoAnalyse?.priorite === "haute"
                          ? "bg-destructive/10 ring-destructive/30"
                          : courrier.metadata?.autoAnalyse?.priorite === "moyenne"
                          ? "bg-warning/10 ring-warning/30"
                          : "bg-white/5 ring-white/10"
                      }`}>
                        <Mail className={`h-4 w-4 ${
                          courrier.metadata?.autoAnalyse?.priorite === "haute"
                            ? "text-destructive"
                            : courrier.metadata?.autoAnalyse?.priorite === "moyenne"
                            ? "text-warning"
                            : "text-muted-foreground"
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium">{courrier.objet}</p>
                          <PrioriteBadge autoAnalyse={courrier.metadata?.autoAnalyse} />
                          {courrier.metadata?.autoAnalyse && (
                            <span title="Analysé par IA">
                              <Sparkles className="h-3 w-3 text-primary/60 shrink-0" />
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-mono">{courrier.reference}</span>
                          <span>·</span>
                          <span>{courrier.typeCourrier === "interne" ? "Interne" : "Externe"}</span>
                          <span>·</span>
                          <span>{courrier.emetteurNom || "—"}</span>
                          <span>·</span>
                          <span>{courrier.directionEmetteurNom || "—"}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <Badge variant={statusConfig[courrier.statut]?.variant ?? "default"}>
                          {statusConfig[courrier.statut]?.label ?? courrier.statut}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDate(courrier.dateEnvoi || courrier.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {courriers.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p className="text-sm text-muted-foreground">Aucun courrier trouvé</p>
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
                  onClick={() => setPage(p => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Suivant
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </AppShell>
      </RBACGuard>
    </AuthGuard>
  );
}

export default function InboxPage() {
  return (
    <Suspense
      fallback={
        <AuthGuard>
          <AppShell>
            <div className="flex items-center justify-center py-24">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          </AppShell>
        </AuthGuard>
      }
    >
      <InboxContent />
    </Suspense>
  );
}
