"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { AuthGuard } from "@/components/auth/auth-guard";
import { RBACGuard } from "@/components/auth/rbac-guard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ClipboardList,
  Download,
  Calendar,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  FileJson,
  FileSpreadsheet,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import {
  downloadAuditReportCsv,
  downloadAuditReportJson,
  downloadAuditReportPdf,
  downloadAuditReportXlsx,
} from "@/lib/audit-report-export";

interface Rapport {
  id: number;
  titre: string;
  periodeDebut: string;
  periodeFin: string;
  createdAt: string;
  statut: string;
  courriersTraites: number;
  delaiMoyen: string;
  anomalies: number;
  resume?: Record<string, any>;
  genereParNom?: string;
}

const RESUME_LABELS: Record<string, string> = {
  courriersTraites: "Courriers traités",
  archives: "Archivés",
  envoyes: "Envoyés",
  recus: "Reçus",
  enTraitement: "En traitement",
  actionsFlux: "Actions de flux",
  evenementsAudit: "Événements d'audit",
  delaiMoyenH: "Délai moyen (heures)",
  anomalies: "Anomalies ouvertes",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR");
}

function defaultPeriod() {
  const fin = new Date();
  const debut = new Date();
  debut.setMonth(debut.getMonth() - 1);
  return {
    debut: debut.toISOString().slice(0, 10),
    fin: fin.toISOString().slice(0, 10),
  };
}

export default function AuditReportsPage() {
  const { accessToken } = useAuthStore();
  const [rapports, setRapports] = useState<Rapport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [exportingId, setExportingId] = useState<number | null>(null);
  const period = defaultPeriod();
  const [titre, setTitre] = useState("Rapport mensuel");
  const [periodeDebut, setPeriodeDebut] = useState(period.debut);
  const [periodeFin, setPeriodeFin] = useState(period.fin);
  const [selected, setSelected] = useState<Rapport | null>(null);

  const fetchReports = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const data: any = await api.getAuditReports(accessToken);
      setRapports(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleCreate = async () => {
    if (!accessToken) return;
    setCreating(true);
    try {
      await api.createAuditReport(accessToken, {
        titre: titre.trim() || "Rapport d'audit",
        periodeDebut: new Date(periodeDebut).toISOString(),
        periodeFin: new Date(`${periodeFin}T23:59:59`).toISOString(),
      });
      setDialogOpen(false);
      await fetchReports();
    } catch (err: any) {
      alert(err.message || "Erreur lors de la génération");
    } finally {
      setCreating(false);
    }
  };

  const handlePdf = async (rapport: Rapport) => {
    setExportingId(rapport.id);
    try {
      await downloadAuditReportPdf(rapport);
    } catch (err: any) {
      alert(err.message || "Erreur lors de l'export PDF");
    } finally {
      setExportingId(null);
    }
  };

  const handleXlsx = async (rapport: Rapport) => {
    setExportingId(rapport.id);
    try {
      await downloadAuditReportXlsx(rapport);
    } catch (err: any) {
      alert(err.message || "Erreur lors de l'export Excel");
    } finally {
      setExportingId(null);
    }
  };

  return (
    <AuthGuard>
      <RBACGuard allowedRoles={["auditeur", "super_admin"]}>
        <AppShell>
          <div className="flex flex-col gap-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/15">
                    <ClipboardList className="h-5 w-5 text-yellow-400" />
                  </span>
                  Rapports d&apos;audit
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Générez et consultez les rapports d&apos;audit
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={fetchReports}>
                  <RefreshCw className="h-4 w-4" />
                  Actualiser
                </Button>
                <Button size="sm" onClick={() => setDialogOpen(true)}>
                  <FileText className="h-4 w-4" />
                  Nouveau rapport
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-sm text-destructive">{error}</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={fetchReports}>
                    Réessayer
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col gap-4">
                {rapports.map((rapport) => (
                  <Card key={rapport.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-500/15">
                            <ClipboardList className="h-5 w-5 text-yellow-400" />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold">{rapport.titre}</h3>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {formatDate(rapport.periodeDebut)} — {formatDate(rapport.periodeFin)}
                              </span>
                              <span>·</span>
                              <span>Généré le {formatDate(rapport.createdAt)}</span>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-4">
                              <div className="flex items-center gap-1.5 text-xs">
                                <FileText className="h-3.5 w-3.5 text-sky-400" />
                                <span>{rapport.courriersTraites} courriers traités</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs">
                                <Clock className="h-3.5 w-3.5 text-emerald-400" />
                                <span>Délai moyen: {rapport.delaiMoyen}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs">
                                {rapport.anomalies > 0 ? (
                                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                                ) : (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                )}
                                <span>{rapport.anomalies} anomalie(s)</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="success">Généré</Badge>
                          <Button variant="outline" size="sm" onClick={() => setSelected(rapport)}>
                            Détail
                          </Button>
                          <Button
                            size="sm"
                            disabled={exportingId === rapport.id}
                            onClick={() => handlePdf(rapport)}
                          >
                            <Download className="h-4 w-4" />
                            {exportingId === rapport.id ? "…" : "PDF"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={exportingId === rapport.id}
                            onClick={() => handleXlsx(rapport)}
                          >
                            <FileSpreadsheet className="h-4 w-4" />
                            Excel
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                Autres
                                <ChevronDown className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => downloadAuditReportCsv(rapport)}>
                                <FileSpreadsheet className="h-4 w-4 mr-2" />
                                CSV
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => downloadAuditReportJson(rapport)}>
                                <FileJson className="h-4 w-4 mr-2" />
                                JSON
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {rapports.length === 0 && (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <ClipboardList className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p className="text-sm text-muted-foreground mb-4">Aucun rapport généré</p>
                      <Button size="sm" onClick={() => setDialogOpen(true)}>
                        Créer le premier rapport
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouveau rapport d&apos;audit</DialogTitle>
                <DialogDescription>
                  Les indicateurs sont calculés sur la période choisie à partir des données réelles.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label htmlFor="titre">Titre</Label>
                  <Input id="titre" value={titre} onChange={(e) => setTitre(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="debut">Début</Label>
                    <Input
                      id="debut"
                      type="date"
                      value={periodeDebut}
                      onChange={(e) => setPeriodeDebut(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="fin">Fin</Label>
                    <Input
                      id="fin"
                      type="date"
                      value={periodeFin}
                      onChange={(e) => setPeriodeFin(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={creating}>
                  Annuler
                </Button>
                <Button onClick={handleCreate} disabled={creating}>
                  {creating ? "Génération…" : "Générer"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{selected?.titre}</DialogTitle>
                <DialogDescription>
                  {selected &&
                    `${formatDate(selected.periodeDebut)} — ${formatDate(selected.periodeFin)}`}
                </DialogDescription>
              </DialogHeader>
              {selected?.resume && (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {Object.entries(selected.resume).map(([k, v]) => (
                    <div key={k} className="rounded-lg bg-secondary/40 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {RESUME_LABELS[k] || k}
                      </p>
                      <p className="font-medium">{String(v)}</p>
                    </div>
                  ))}
                </div>
              )}
              <DialogFooter className="gap-2 sm:gap-2">
                {selected && (
                  <>
                    <Button
                      size="sm"
                      disabled={exportingId === selected.id}
                      onClick={() => handlePdf(selected)}
                    >
                      <Download className="h-4 w-4" />
                      PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={exportingId === selected.id}
                      onClick={() => handleXlsx(selected)}
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      Excel
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadAuditReportCsv(selected)}
                    >
                      CSV
                    </Button>
                  </>
                )}
                <Button variant="outline" onClick={() => setSelected(null)}>
                  Fermer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </AppShell>
      </RBACGuard>
    </AuthGuard>
  );
}
