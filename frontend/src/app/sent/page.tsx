"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
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
  Send,
  Search,
  Filter,
  MailCheck,
  RefreshCw,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

const statusConfig: Record<string, { label: string; variant: "default" | "success" | "warning" | "info" | "secondary" | "destructive" | "outline" }> = {
  envoye: { label: "Envoyé", variant: "default" },
  en_traitement: { label: "En traitement", variant: "info" },
  recu: { label: "Reçu", variant: "success" },
  archive: { label: "Archivé", variant: "outline" },
};

interface Courrier {
  id: number;
  reference: string;
  objet: string;
  typeCourrier: string;
  statut: string;
  dateEnvoi: string | null;
  createdAt: string;
  emetteurNom: string | null;
  directionEmetteurNom: string | null;
}

export default function SentPage() {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["courriers", "sent", appliedSearch, statusFilter, page],
    queryFn: () => api.getCourriers(accessToken!, {
      scope: "sent",
      search: appliedSearch || undefined,
      statut: statusFilter !== "all" ? statusFilter : undefined,
      page,
      limit: 20,
    }),
    enabled: !!accessToken,
  });

  const courriers: Courrier[] = (data as any)?.data || [];
  const pagination = (data as any)?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 };

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
                <Send className="h-6 w-6 text-primary" />
                Courriers envoyés
              </h1>
              <p className="text-sm text-muted-foreground">
                {pagination.total} courrier(s) envoyé(s)
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
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par référence, objet..."
                    className="pl-10 rounded-xl"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (() => { setAppliedSearch(searchInput); setPage(1); })()}
                  />
                </div>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="envoye">Envoyé</SelectItem>
                    <SelectItem value="en_traitement">En traitement</SelectItem>
                    <SelectItem value="recu">Reçu</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => { setAppliedSearch(searchInput); setPage(1); }}>
                  Rechercher
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Courriers envoyés ({pagination.total})
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
                      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10">
                        <MailCheck className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium">{courrier.objet}</p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-mono">{courrier.reference}</span>
                          <span>·</span>
                          <span>{courrier.typeCourrier === "interne" ? "Interne" : "Externe"}</span>
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
                      <Send className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p className="text-sm text-muted-foreground">Aucun courrier envoyé</p>
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
                <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" /> Précédent
                </Button>
                <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>
                  Suivant <ChevronRight className="h-4 w-4" />
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
