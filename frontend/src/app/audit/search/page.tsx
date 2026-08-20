"use client";

import React, { useCallback, useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AuthGuard } from "@/components/auth/auth-guard";
import { RBACGuard } from "@/components/auth/rbac-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  FileSearch,
  Search,
  Filter,
  Download,
  Eye,
  Calendar,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

interface SearchResult {
  id: number;
  reference: string;
  objet: string;
  typeCourrier: string;
  statut: string;
  createdAt: string;
  emetteurNom: string;
  directionNom: string;
  actionsCount: number;
}

const statutLabel: Record<string, string> = {
  envoye: "Envoyé",
  recu: "Reçu",
  en_traitement: "En traitement",
  archive: "Archivé",
};

function AuditSearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accessToken } = useAuthStore();
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [statut, setStatut] = useState("all");
  const [periode, setPeriode] = useState("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResults = useCallback(async (p = 1) => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const data: any = await api.searchAuditCourriers(accessToken, {
        search: search || undefined,
        statut: statut !== "all" ? statut : undefined,
        periode: periode !== "all" ? periode : undefined,
        page: p,
        limit: 20,
      });
      setResults(data.data || []);
      setTotal(data.pagination?.total || 0);
      setPage(data.pagination?.page || p);
      setTotalPages(data.pagination?.totalPages || 0);
    } catch (err: any) {
      setError(err.message || "Erreur de recherche");
    } finally {
      setLoading(false);
    }
  }, [accessToken, search, statut, periode]);

  useEffect(() => {
    fetchResults(1);
  }, [fetchResults]);

  const exportCsv = () => {
    const header = "reference;objet;emetteur;direction;statut;actions;date\n";
    const rows = results
      .map((r) =>
        [
          r.reference,
          `"${(r.objet || "").replace(/"/g, '""')}"`,
          r.emetteurNom,
          r.directionNom,
          r.statut,
          r.actionsCount,
          new Date(r.createdAt).toLocaleDateString("fr-FR"),
        ].join(";")
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-recherche-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AuthGuard>
      <RBACGuard allowedRoles={["auditeur", "super_admin"]}>
        <AppShell>
          <div className="flex flex-col gap-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-[-0.02em] flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-500/15">
                    <FileSearch className="h-5 w-5 text-lime-400" />
                  </span>
                  Recherche avancée
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Lecture seule — tous les courriers de la plateforme
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => fetchResults(page)}>
                  <RefreshCw className="h-4 w-4" />
                  Actualiser
                </Button>
                <Button variant="outline" size="sm" onClick={exportCsv} disabled={!results.length}>
                  <Download className="h-4 w-4" />
                  Exporter CSV
                </Button>
              </div>
            </div>

            <Card className="border-white/10 bg-white/5">
              <CardContent className="p-4">
                <div className="flex flex-col gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher par référence, objet, contenu..."
                      className="pl-10 rounded-xl"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && fetchResults(1)}
                    />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Select value={statut} onValueChange={setStatut}>
                      <SelectTrigger className="w-[180px]">
                        <Filter className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Statut" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les statuts</SelectItem>
                        <SelectItem value="recu">Reçu</SelectItem>
                        <SelectItem value="en_traitement">En traitement</SelectItem>
                        <SelectItem value="envoye">Envoyé</SelectItem>
                        <SelectItem value="archive">Archivé</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={periode} onValueChange={setPeriode}>
                      <SelectTrigger className="w-[180px]">
                        <Calendar className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Période" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes les périodes</SelectItem>
                        <SelectItem value="today">Aujourd&apos;hui</SelectItem>
                        <SelectItem value="week">Cette semaine</SelectItem>
                        <SelectItem value="month">Ce mois</SelectItem>
                        <SelectItem value="year">Cette année</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={() => fetchResults(1)}>
                      Rechercher
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Résultats ({total})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : error ? (
                  <div className="py-12 text-center">
                    <p className="text-sm text-destructive">{error}</p>
                    <Button variant="outline" size="sm" className="mt-4" onClick={() => fetchResults(1)}>
                      Réessayer
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {results.map((result) => (
                      <div
                        key={result.id}
                        className="flex items-start gap-4 px-6 py-4 transition-colors hover:bg-white/5"
                      >
                        <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lime-500/15">
                          <FileSearch className="h-4 w-4 text-lime-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium">{result.objet}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-mono text-teal-400/90">{result.reference}</span>
                            <span>·</span>
                            <span>{result.emetteurNom}</span>
                            <span>·</span>
                            <span>{result.directionNom}</span>
                            <span>·</span>
                            <span>{result.actionsCount} action(s)</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <Badge variant="outline">{statutLabel[result.statut] || result.statut}</Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(result.createdAt).toLocaleDateString("fr-FR")}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/courriers/${result.id}`)}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Consulter
                          </Button>
                        </div>
                      </div>
                    ))}
                    {results.length === 0 && (
                      <div className="py-12 text-center text-sm text-muted-foreground">
                        Aucun résultat
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {page} / {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => fetchResults(page - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                    Précédent
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => fetchResults(page + 1)}>
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

export default function AuditSearchPage() {
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
      <AuditSearchContent />
    </Suspense>
  );
}
