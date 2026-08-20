"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { AuthGuard } from "@/components/auth/auth-guard";
import { RBACGuard } from "@/components/auth/rbac-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconBtn } from "@/components/ui/icon-btn";
import {
  FileText,
  Search,
  Edit3,
  Trash2,
  Plus,
  Clock,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

interface Draft {
  id: number;
  reference: string;
  objet: string;
  typeCourrier: string;
  statut: string;
  createdAt: string;
}

export default function DraftsPage() {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["courriers", "drafts", appliedSearch, page],
    queryFn: () => api.getCourriers(accessToken!, {
      scope: "drafts",
      search: appliedSearch || undefined,
      page,
      limit: 20,
    }),
    enabled: !!accessToken,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteCourrier(accessToken!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courriers", "drafts"] });
    },
  });

  const drafts: Draft[] = (data as any)?.data || [];
  const pagination = (data as any)?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 };

  const handleDelete = (id: number) => {
    if (!confirm("Supprimer ce brouillon ?")) return;
    deleteMutation.mutate(id);
  };

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
                <FileText className="h-6 w-6 text-primary" />
                Brouillons
              </h1>
              <p className="text-sm text-muted-foreground">
                {pagination.total} brouillon(s)
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
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un brouillon..."
                  className="pl-10 rounded-xl"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (() => { setAppliedSearch(searchInput); setPage(1); })()}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Brouillons ({pagination.total})
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
                  {drafts.map((draft) => (
                    <div
                      key={draft.id}
                      className="flex items-start gap-4 px-6 py-4 transition-colors hover:bg-white/5"
                    >
                      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10">
                        <Edit3 className="h-4 w-4 text-warning" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium">{draft.objet}</p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-mono">{draft.reference}</span>
                          <span>·</span>
                          <span>{draft.typeCourrier === "interne" ? "Interne" : "Externe"}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>Créé le {formatDate(draft.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge variant="secondary">Brouillon</Badge>
                        <IconBtn tooltip="Modifier" onClick={() => router.push(`/courriers/${draft.id}`)}>
                          <Edit3 className="h-4 w-4" />
                        </IconBtn>
                        <IconBtn
                          tooltip="Supprimer"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(draft.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </IconBtn>
                      </div>
                    </div>
                  ))}
                  {drafts.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p className="text-sm text-muted-foreground">Aucun brouillon</p>
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
