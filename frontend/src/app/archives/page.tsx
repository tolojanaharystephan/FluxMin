"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AuthGuard } from "@/components/auth/auth-guard";
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
  Archive,
  Search,
  Filter,
  Eye,
  Calendar,
  Clock,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Undo2,
  MapPin,
  AlertTriangle,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

interface ArchiveEntry {
  id: number;
  courrierId: number;
  dateArchivage: string | null;
  dureeConservation: number | null;
  emplacement: string | null;
  reference: string;
  objet: string;
  typeCourrier: string;
  createdAt: string;
  emetteurNom: string | null;
  directionEmetteurNom: string | null;
  dateExpiration?: string | null;
  joursRestants?: number | null;
  retentionStatus?: "ok" | "expire_soon" | "expired" | "unknown";
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const retentionBadge = (status?: string) => {
  switch (status) {
    case "expired":
      return { label: "Expiré", className: "border-red-500/40 bg-red-500/10 text-red-400" };
    case "expire_soon":
      return { label: "Expire bientôt", className: "border-amber-500/40 bg-amber-500/10 text-amber-400" };
    case "ok":
      return { label: "Valide", className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" };
    default:
      return { label: "—", className: "border-border text-muted-foreground" };
  }
};

export default function ArchivesPage() {
  const router = useRouter();
  const { accessToken, user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [retentionFilter, setRetentionFilter] = useState("all");
  const [archives, setArchives] = useState<ArchiveEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canArchive = user?.permissions?.includes("archive_courrier") ?? false;

  const fetchArchives = useCallback(async (page = 1) => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const data: any = await api.getArchives(accessToken, {
        search: searchQuery || undefined,
        type: typeFilter !== "all" ? typeFilter : undefined,
        retention: retentionFilter !== "all" ? retentionFilter : undefined,
        page,
        limit: 20,
      });
      setArchives(data.data || []);
      setPagination(data.pagination);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  }, [accessToken, searchQuery, typeFilter, retentionFilter]);

  useEffect(() => {
    fetchArchives(1);
  }, [fetchArchives]);

  const handleDesarchiver = async (archiveId: number) => {
    if (!accessToken) return;
    if (!confirm("Désarchiver ce courrier ? Il reviendra au statut « reçu ».")) return;
    try {
      await api.desarchiverCourrier(accessToken, archiveId);
      fetchArchives(pagination.page);
    } catch (err: any) {
      alert(err.message || "Erreur lors du désarchivage");
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <AuthGuard>
      <AppShell>
        <div className="flex flex-col gap-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/15">
                  <Archive className="h-5 w-5 text-orange-400" />
                </span>
                Archives
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {pagination.total} courrier(s) archivé(s)
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchArchives(pagination.page)}>
              <RefreshCw className="h-4 w-4" />
              Actualiser
            </Button>
          </div>

          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher dans les archives..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && fetchArchives(1)}
                  />
                </div>
                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v)}>
                  <SelectTrigger className="w-[160px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    <SelectItem value="interne">Interne</SelectItem>
                    <SelectItem value="externe">Externe</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={retentionFilter} onValueChange={(v) => setRetentionFilter(v)}>
                  <SelectTrigger className="w-[180px]">
                    <Clock className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Rétention" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toute rétention</SelectItem>
                    <SelectItem value="ok">Valide</SelectItem>
                    <SelectItem value="expire_soon">Expire bientôt</SelectItem>
                    <SelectItem value="expired">Expiré</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => fetchArchives(1)}>
                  Rechercher
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Courriers archivés ({pagination.total})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-sm text-destructive">{error}</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => fetchArchives(1)}>
                    Réessayer
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {archives.map((archive) => {
                    const badge = retentionBadge(archive.retentionStatus);
                    return (
                      <div
                        key={archive.id}
                        className="flex items-start gap-4 px-6 py-4 transition-colors hover:bg-secondary/30"
                      >
                        <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/15">
                          <Archive className="h-4 w-4 text-orange-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="truncate text-sm font-medium">{archive.objet}</p>
                            <Badge variant="outline" className={`text-[10px] ${badge.className}`}>
                              {archive.retentionStatus === "expire_soon" || archive.retentionStatus === "expired" ? (
                                <AlertTriangle className="mr-1 h-3 w-3" />
                              ) : null}
                              {badge.label}
                            </Badge>
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                            <span className="font-mono text-teal-400/90">{archive.reference}</span>
                            <span>·</span>
                            <span>{archive.emetteurNom || "—"}</span>
                            <span>·</span>
                            <Badge variant="outline" className="text-[10px]">
                              {archive.typeCourrier === "interne" ? "Interne" : "Externe"}
                            </Badge>
                          </div>
                          <div className="mt-1.5 flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-sky-400" />
                              Archivé le {formatDate(archive.dateArchivage)}
                            </span>
                            {archive.dureeConservation != null && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-amber-400" />
                                {archive.dureeConservation} ans
                                {archive.dateExpiration
                                  ? ` · jusqu'au ${formatDate(archive.dateExpiration)}`
                                  : ""}
                              </span>
                            )}
                            {archive.emplacement && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-rose-400" />
                                {archive.emplacement}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/courriers/${archive.courrierId}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Consulter
                          </Button>
                          {canArchive && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDesarchiver(archive.id)}
                            >
                              <Undo2 className="h-4 w-4 mr-1" />
                              Désarchiver
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {archives.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Archive className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p className="text-sm text-muted-foreground">Aucune archive trouvée</p>
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
                  onClick={() => fetchArchives(pagination.page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchArchives(pagination.page + 1)}
                >
                  Suivant
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </AppShell>
    </AuthGuard>
  );
}
