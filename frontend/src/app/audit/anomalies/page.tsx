"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AuthGuard } from "@/components/auth/auth-guard";
import { RBACGuard } from "@/components/auth/rbac-guard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Clock,
  AlertCircle,
  CheckCircle2,
  Eye,
  Filter,
  RefreshCw,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

interface Anomalie {
  id: string;
  type: "delai" | "workflow";
  title: string;
  courrierId: number;
  courrier: string;
  objet: string;
  dateDetection: string;
  gravite: "haute" | "moyenne" | "basse";
  statut: "en_cours" | "traite";
}

const graviteConfig: Record<
  string,
  { label: string; variant: "default" | "success" | "warning" | "info" | "secondary" | "destructive" | "outline" }
> = {
  haute: { label: "Haute", variant: "destructive" },
  moyenne: { label: "Moyenne", variant: "warning" },
  basse: { label: "Basse", variant: "secondary" },
};

const typeConfig: Record<string, { label: string; icon: React.ElementType }> = {
  delai: { label: "Délai dépassé", icon: Clock },
  workflow: { label: "Workflow", icon: AlertCircle },
};

export default function AuditAnomaliesPage() {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [typeFilter, setTypeFilter] = useState("all");
  const [statutFilter, setStatutFilter] = useState("en_cours");
  const [anomalies, setAnomalies] = useState<Anomalie[]>([]);
  const [enCours, setEnCours] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);

  const fetchAnomalies = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const data: any = await api.getAuditAnomalies(accessToken, {
        type: typeFilter !== "all" ? typeFilter : undefined,
        statut: statutFilter !== "all" ? statutFilter : undefined,
      });
      setAnomalies(data.data || []);
      setEnCours(data.summary?.enCours ?? 0);
    } catch (err: any) {
      setError(err.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [accessToken, typeFilter, statutFilter]);

  useEffect(() => {
    fetchAnomalies();
  }, [fetchAnomalies]);

  const handleResolve = async (key: string) => {
    if (!accessToken) return;
    if (!confirm("Marquer cette anomalie comme traitée ?")) return;
    setResolving(key);
    try {
      await api.resolveAuditAnomaly(accessToken, key);
      await fetchAnomalies();
    } catch (err: any) {
      alert(err.message || "Erreur");
    } finally {
      setResolving(null);
    }
  };

  return (
    <AuthGuard>
      <RBACGuard allowedRoles={["auditeur", "super_admin", "responsable", "responsable_direction"]}>
        <AppShell>
          <div className="flex flex-col gap-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-[-0.02em] flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                  </span>
                  Anomalies
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {enCours} anomalie(s) en cours — détection automatique (délai 72h, workflow)
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={fetchAnomalies}>
                <RefreshCw className="h-4 w-4" />
                Actualiser
              </Button>
            </div>

            <Card className="border-white/10 bg-white/5">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[200px]">
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Type d'anomalie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les anomalies</SelectItem>
                      <SelectItem value="delai">Délai dépassé</SelectItem>
                      <SelectItem value="workflow">Workflow</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statutFilter} onValueChange={setStatutFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      <SelectItem value="en_cours">En cours</SelectItem>
                      <SelectItem value="traite">Traitées</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {loading ? (
              <div className="flex justify-center py-16">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <Card className="border-white/10 bg-white/5">
                <CardContent className="py-12 text-center">
                  <p className="text-sm text-destructive">{error}</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={fetchAnomalies}>
                    Réessayer
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col gap-4">
                {anomalies.map((anomalie) => {
                  const TypeIcon = typeConfig[anomalie.type]?.icon || AlertTriangle;
                  return (
                    <Card key={anomalie.id} className="border-white/10 bg-white/5">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                                anomalie.gravite === "haute"
                                  ? "bg-destructive/10"
                                  : anomalie.gravite === "moyenne"
                                    ? "bg-warning/10"
                                    : "bg-secondary"
                              }`}
                            >
                              <TypeIcon
                                className={`h-5 w-5 ${
                                  anomalie.gravite === "haute"
                                    ? "text-destructive"
                                    : anomalie.gravite === "moyenne"
                                      ? "text-warning"
                                      : "text-muted-foreground"
                                }`}
                              />
                            </div>
                            <div>
                              <h3 className="text-sm font-semibold">{anomalie.title}</h3>
                              <p className="mt-1 text-xs text-muted-foreground">{anomalie.objet}</p>
                              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <span className="font-mono text-teal-400/90">{anomalie.courrier}</span>
                                <span>·</span>
                                <span>
                                  {new Date(anomalie.dateDetection).toLocaleString("fr-FR")}
                                </span>
                                <span>·</span>
                                <span>{typeConfig[anomalie.type]?.label}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <Badge variant={graviteConfig[anomalie.gravite]?.variant ?? "default"}>
                              {graviteConfig[anomalie.gravite]?.label ?? anomalie.gravite}
                            </Badge>
                            <Badge variant={anomalie.statut === "en_cours" ? "warning" : "success"}>
                              {anomalie.statut === "en_cours" ? "En cours" : "Traité"}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/courriers/${anomalie.courrierId}`)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Consulter
                            </Button>
                            {anomalie.statut === "en_cours" && (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={resolving === anomalie.id}
                                onClick={() => handleResolve(anomalie.id)}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Traiter
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {anomalies.length === 0 && (
                  <Card className="border-white/10 bg-white/5">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <CheckCircle2 className="h-12 w-12 text-success/50 mb-4" />
                      <p className="text-sm text-muted-foreground">Aucune anomalie trouvée</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </AppShell>
      </RBACGuard>
    </AuthGuard>
  );
}
