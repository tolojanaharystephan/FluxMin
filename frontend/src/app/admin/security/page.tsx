"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { AuthGuard } from "@/components/auth/auth-guard";
import { RBACGuard } from "@/components/auth/rbac-guard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ShieldAlert,
  Search,
  RefreshCw,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Ban,
  ShieldOff,
  Eye,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

interface SecurityLog {
  id: number;
  email: string | null;
  succes: boolean;
  motif: string | null;
  risque: string;
  ip: string;
  sessionId: string | null;
  sessionRevoked?: boolean;
  pays: string | null;
  paysCode: string | null;
  ville: string | null;
  region: string | null;
  isp: string | null;
  latitude: string | null;
  longitude: string | null;
  horsMadagascar: boolean;
  ipAutreMinistere: boolean;
  details: { ministereNom?: string; autreMinistereNom?: string; geoProvider?: string } | null;
  createdAt: string;
}

interface SecurityLogDetail extends SecurityLog {
  session: {
    id: string;
    revokedAt: string | null;
    expiresAt: string | null;
    ip: string | null;
  } | null;
  activity: {
    id: number;
    action: string | null;
    entiteType: string | null;
    entiteId: number | null;
    ip: string | null;
    createdAt: string;
  }[];
}

function mapUrl(lat: string, lon: string) {
  return `https://www.openstreetmap.org/?mlat=${encodeURIComponent(lat)}&mlon=${encodeURIComponent(lon)}#map=12/${encodeURIComponent(lat)}/${encodeURIComponent(lon)}`;
}

function embedMapUrl(lat: string, lon: string) {
  const la = Number(lat);
  const lo = Number(lon);
  if (Number.isNaN(la) || Number.isNaN(lo)) return null;
  const d = 0.08;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lo - d}%2C${la - d}%2C${lo + d}%2C${la + d}&layer=mapnik&marker=${la}%2C${lo}`;
}

const risqueBadge: Record<string, { label: string; variant: "secondary" | "warning" | "destructive" | "outline" }> = {
  faible: { label: "Faible", variant: "secondary" },
  moyen: { label: "Moyen", variant: "warning" },
  eleve: { label: "Suspect", variant: "warning" },
  critique: { label: "Critique", variant: "destructive" },
};

export default function AdminSecurityPage() {
  const { accessToken } = useAuthStore();
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [summary, setSummary] = useState({ critiques: 0, suspects: 0, echecs: 0 });
  const [pagination, setPagination] = useState({ page: 1, totalPages: 0, total: 0 });
  const [page, setPage] = useState(1);
  const [risque, setRisque] = useState("all");
  const [succes, setSucces] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<SecurityLogDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  const fetchLogs = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const data: any = await api.getSecurityLogs(accessToken, {
        page,
        limit: 20,
        risque,
        succes,
        search: search.trim() || undefined,
      });
      setLogs(data.data || []);
      setPagination(data.pagination || { page: 1, totalPages: 0, total: 0 });
      setSummary(data.summary || { critiques: 0, suspects: 0, echecs: 0 });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [accessToken, page, risque, succes, search]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const openDetail = async (id: number) => {
    if (!accessToken) return;
    try {
      const data = (await api.getSecurityLogDetail(accessToken, id)) as SecurityLogDetail;
      setDetail(data);
      setDetailOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  const revokeSession = async () => {
    if (!accessToken || !detail?.sessionId) return;
    setActionBusy(true);
    try {
      await api.revokeSecuritySession(accessToken, detail.sessionId, "Action admin sécurité");
      await openDetail(detail.id);
      await fetchLogs();
    } catch (err) {
      console.error(err);
    } finally {
      setActionBusy(false);
    }
  };

  const blockIp = async () => {
    if (!accessToken || !detail?.ip) return;
    setActionBusy(true);
    try {
      await api.blockSecurityIp(accessToken, detail.ip, 60, "Blocage depuis journal sécurité");
      await fetchLogs();
    } catch (err) {
      console.error(err);
    } finally {
      setActionBusy(false);
    }
  };

  const embed = detail?.latitude && detail?.longitude
    ? embedMapUrl(detail.latitude, detail.longitude)
    : null;

  return (
    <AuthGuard>
      <RBACGuard allowedRoles={["super_admin"]}>
        <AppShell>
          <div className="flex flex-col gap-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-[-0.02em] flex items-center gap-3">
                  <ShieldAlert className="h-6 w-6 text-red-400" />
                  Journal de sécurité
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Tentatives de connexion, localisation IP et sessions
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={fetchLogs}>
                <RefreshCw className="h-4 w-4" />
                Actualiser
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Card className="border-white/10 bg-white/5">
                <CardContent className="p-4">
                  <p className="text-[10px] uppercase text-muted-foreground">Critiques</p>
                  <p className="text-2xl font-semibold text-destructive">{summary.critiques}</p>
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-white/5">
                <CardContent className="p-4">
                  <p className="text-[10px] uppercase text-muted-foreground">Suspects</p>
                  <p className="text-2xl font-semibold text-warning">{summary.suspects}</p>
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-white/5">
                <CardContent className="p-4">
                  <p className="text-[10px] uppercase text-muted-foreground">Échecs</p>
                  <p className="text-2xl font-semibold">{summary.echecs}</p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-white/10 bg-white/5">
              <CardContent className="p-4 flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Email, IP, ville, session…"
                    className="pl-10 rounded-xl"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    onKeyDown={(e) => e.key === "Enter" && fetchLogs()}
                  />
                </div>
                <Select value={risque} onValueChange={(v) => { setRisque(v); setPage(1); }}>
                  <SelectTrigger className="w-[160px]"><SelectValue placeholder="Risque" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les risques</SelectItem>
                    <SelectItem value="critique">Critique</SelectItem>
                    <SelectItem value="eleve">Suspect</SelectItem>
                    <SelectItem value="moyen">Moyen</SelectItem>
                    <SelectItem value="faible">Faible</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={succes} onValueChange={(v) => { setSucces(v); setPage(1); }}>
                  <SelectTrigger className="w-[160px]"><SelectValue placeholder="Résultat" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="true">Succès</SelectItem>
                    <SelectItem value="false">Échec</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/5">
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex justify-center py-16">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {logs.map((log) => (
                      <div key={log.id} className="flex items-start gap-4 px-6 py-4">
                        <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
                          <MapPin className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {log.email || "Email inconnu"}
                            {log.details?.ministereNom ? (
                              <span className="text-muted-foreground font-normal"> · {log.details.ministereNom}</span>
                            ) : null}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 font-mono">
                            {log.ip}
                            {" · "}
                            {[log.ville, log.region, log.pays].filter(Boolean).join(", ") || "localisation inconnue"}
                            {log.isp ? ` · ${log.isp}` : ""}
                          </p>
                          {log.sessionId && (
                            <p className="text-[10px] text-muted-foreground mt-1 font-mono truncate">
                              session {log.sessionId}
                              {log.sessionRevoked ? " · révoquée" : ""}
                            </p>
                          )}
                          {log.ipAutreMinistere && (
                            <p className="text-xs text-warning mt-1">
                              IP déjà vue au ministère {log.details?.autreMinistereNom || "autre"}
                            </p>
                          )}
                          {log.horsMadagascar && (
                            <p className="text-xs text-destructive mt-1">Hors Madagascar</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <Badge variant={risqueBadge[log.risque]?.variant ?? "outline"}>
                            {risqueBadge[log.risque]?.label ?? log.risque}
                          </Badge>
                          <Badge variant={log.succes ? "success" : "destructive"}>
                            {log.succes ? "Succès" : "Échec"}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(log.createdAt).toLocaleString("fr-FR")}
                          </span>
                          <Button variant="outline" size="sm" onClick={() => openDetail(log.id)}>
                            <Eye className="h-3.5 w-3.5" />
                            Détail
                          </Button>
                        </div>
                      </div>
                    ))}
                    {logs.length === 0 && (
                      <p className="py-12 text-center text-sm text-muted-foreground">
                        Aucune tentative enregistrée
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {pagination.page} / {pagination.totalPages}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    <ChevronLeft className="h-4 w-4" /> Précédent
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
                    Suivant <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-white/10 bg-[#0e1513]">
              <DialogHeader>
                <DialogTitle>Détail connexion</DialogTitle>
                <DialogDescription>
                  {detail?.email || "—"} · {detail?.ip}
                </DialogDescription>
              </DialogHeader>

              {detail && (
                <div className="flex flex-col gap-4">
                  {embed ? (
                    <div className="overflow-hidden rounded-xl ring-1 ring-white/10">
                      <iframe
                        title="Carte localisation"
                        src={embed}
                        className="h-56 w-full border-0"
                        loading="lazy"
                      />
                      <a
                        href={mapUrl(detail.latitude!, detail.longitude!)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 px-3 py-2 text-xs text-primary hover:underline"
                      >
                        <MapPin className="h-3 w-3" />
                        Ouvrir dans OpenStreetMap
                      </a>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Pas de coordonnées GPS pour cette IP (réseau local ou lookup indisponible).
                    </p>
                  )}

                  <div className="grid gap-2 text-sm sm:grid-cols-2">
                    <p><span className="text-muted-foreground">Lieu :</span> {[detail.ville, detail.region, detail.pays].filter(Boolean).join(", ") || "—"}</p>
                    <p><span className="text-muted-foreground">FAI :</span> {detail.isp || "—"}</p>
                    <p><span className="text-muted-foreground">Risque :</span> {detail.risque}</p>
                    <p><span className="text-muted-foreground">Motif :</span> {detail.motif || "—"}</p>
                    <p className="sm:col-span-2 font-mono text-xs break-all">
                      <span className="text-muted-foreground">Session :</span> {detail.sessionId || "—"}
                      {detail.sessionRevoked ? " (révoquée)" : ""}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {detail.sessionId && !detail.sessionRevoked && (
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={actionBusy}
                        onClick={revokeSession}
                      >
                        <ShieldOff className="h-4 w-4" />
                        Révoquer la session
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={actionBusy || !detail.ip || detail.ip === "unknown"}
                      onClick={blockIp}
                    >
                      <Ban className="h-4 w-4" />
                      Bloquer l&apos;IP (60 min)
                    </Button>
                  </div>

                  <div>
                    <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                      Activité récente
                    </p>
                    {detail.activity?.length ? (
                      <div className="max-h-48 divide-y divide-white/10 overflow-y-auto rounded-xl ring-1 ring-white/10">
                        {detail.activity.map((a) => (
                          <div key={a.id} className="px-3 py-2 text-xs">
                            <p className="font-medium truncate">{a.action}</p>
                            <p className="text-muted-foreground">
                              {new Date(a.createdAt).toLocaleString("fr-FR")}
                              {a.entiteType ? ` · ${a.entiteType}` : ""}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Aucune action audit liée.</p>
                    )}
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </AppShell>
      </RBACGuard>
    </AuthGuard>
  );
}
