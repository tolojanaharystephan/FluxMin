"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Send,
  Forward,
  CheckCircle2,
  Clock,
  User,
  Building2,
  RefreshCw,
  Archive,
  Undo2,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { MessagePanel } from "@/components/messaging/message-panel";
import { AttachmentsPanel } from "@/components/courrier/attachments-panel";
import { ArchiveDialog } from "@/components/courrier/archive-dialog";
import { AiAnalysisDialog, type AiAnalysisPayload } from "@/components/ai/ai-analysis-dialog";

const statusConfig: Record<string, { label: string; variant: "default" | "success" | "warning" | "info" | "secondary" | "destructive" | "outline" }> = {
  en_traitement: { label: "En traitement", variant: "info" },
  recu: { label: "Reçu", variant: "success" },
  envoye: { label: "Envoyé", variant: "default" },
  brouillon: { label: "Brouillon", variant: "secondary" },
  archive: { label: "Archivé", variant: "outline" },
};

const actionLabels: Record<string, string> = {
  creation: "Création",
  envoi: "Envoi",
  reception: "Réception",
  transmission: "Transmission",
  validation: "Validation",
  archivage: "Archivage",
  desarchivage: "Désarchivage",
};

interface CourrierDetail {
  id: number;
  reference: string;
  objet: string;
  corps: string | null;
  typeCourrier: string;
  statut: string;
  dateEnvoi: string | null;
  dateReception: string | null;
  createdAt: string;
  emetteur: { id: number; nom: string; prenom: string; email: string } | null;
  directionEmetteur: { id: number; nom: string } | null;
  destinataireDirection: { id: number; nom: string } | null;
  historique: Array<{
    id: number;
    action: string;
    commentaire: string | null;
    dateAction: string;
    directionId: number;
    utilisateurId: number;
  }>;
  piecesJointes: Array<{
    id: number;
    nomFichier: string;
    typeMime: string;
    tailleBytes: number;
  }>;
  archive?: {
    id: number;
    dateArchivage: string | null;
    dureeConservation: number | null;
    emplacement: string | null;
  } | null;
}

interface Direction {
  id: number;
  nom: string;
}

export default function CourrierDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);
  const { accessToken, user } = useAuthStore();

  const [courrier, setCourrier] = useState<CourrierDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [directions, setDirections] = useState<Direction[]>([]);
  const [selectedDirectionId, setSelectedDirectionId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [pjUploading, setPjUploading] = useState(false);
  const [pjError, setPjError] = useState<string | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysisPayload | null>(null);
  const [aiFilename, setAiFilename] = useState<string>("");
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);
  const [analyzingAll, setAnalyzingAll] = useState(false);

  const canArchive = user?.permissions?.includes("archive_courrier") ?? false;
  const canUseAi = user?.permissions?.includes("use_ai_features") ?? ["responsable", "responsable_direction", "agent_courrier", "admin_ministere", "super_admin"].includes(user?.role || "");

  const fetchCourrier = async () => {
    if (!accessToken || !id) return;
    setLoading(true);
    setError(null);
    try {
      const data: any = await api.getCourrier(accessToken, id);
      setCourrier(data);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourrier();
  }, [accessToken, id]);

  useEffect(() => {
    if (!accessToken || !user?.ministereId) {
      setDirections([]);
      return;
    }
    // Transmission : uniquement les directions du même ministère
    api
      .getDirections(accessToken, user.ministereId)
      .then((data: any) => setDirections(data || []))
      .catch(() => setDirections([]));
  }, [accessToken, user?.ministereId]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleEnvoyer = async () => {
    if (!accessToken || !id) return;
    setActionLoading(true);
    try {
      await api.envoyerCourrier(accessToken, id);
      await fetchCourrier();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTransmettre = async () => {
    if (!accessToken || !id || !selectedDirectionId) return;
    setActionLoading(true);
    try {
      await api.transmettreCourrier(accessToken, id, {
        destinataireDirectionId: selectedDirectionId,
      });
      await fetchCourrier();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecevoir = async () => {
    if (!accessToken || !id) return;
    setActionLoading(true);
    try {
      await api.recevoirCourrier(accessToken, id);
      await fetchCourrier();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSupprimer = async () => {
    if (!accessToken || !id) return;
    if (!confirm("Supprimer ce courrier ?")) return;
    setActionLoading(true);
    try {
      await api.deleteCourrier(accessToken, id);
      router.push("/inbox");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchiver = async (data: { dureeConservation: number; emplacement?: string }) => {
    if (!accessToken || !id) return;
    setActionLoading(true);
    try {
      await api.archiverCourrier(accessToken, id, data);
      await fetchCourrier();
    } catch (err: any) {
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const handleDesarchiver = async () => {
    if (!accessToken || !courrier?.archive?.id) return;
    if (!confirm("Désarchiver ce courrier ? Il reviendra au statut « reçu ».")) return;
    setActionLoading(true);
    try {
      await api.desarchiverCourrier(accessToken, courrier.archive.id);
      await fetchCourrier();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownload = async (pjId: number) => {
    if (!accessToken || !id) return;
    setPjError(null);
    try {
      await api.downloadPieceJointe(accessToken, id, pjId);
    } catch (err: any) {
      setPjError(err.message || "Erreur lors du téléchargement");
    }
  };

  const handleUploadPj = async (files: File[]) => {
    if (!accessToken || !id) return;
    setPjUploading(true);
    setPjError(null);
    const errors: string[] = [];
    try {
      for (const file of files) {
        try {
          await api.uploadPieceJointe(accessToken, id, file);
        } catch (err: any) {
          errors.push(`${file.name}: ${err.message || "échec"}`);
        }
      }
      await fetchCourrier();
      if (errors.length) setPjError(errors.join("\n"));
    } finally {
      setPjUploading(false);
    }
  };

  const handleDeletePj = async (pjId: number) => {
    if (!accessToken || !id) return;
    if (!confirm("Supprimer cette pièce jointe ?")) return;
    setPjError(null);
    try {
      await api.deletePieceJointe(accessToken, id, pjId);
      await fetchCourrier();
    } catch (err: any) {
      setPjError(err.message || "Impossible de supprimer le fichier");
    }
  };

  const handleAnalyzePj = async (pjId: number) => {
    if (!accessToken || !id) return;
    const pj = courrier?.piecesJointes?.find((p) => p.id === pjId);
    setAnalyzingId(pjId);
    setAiFilename(pj?.nomFichier || "");
    setAiError(null);
    setAiAnalysis(null);
    setAiOpen(true);
    setAiLoading(true);
    try {
      const res: any = await api.analyzePieceJointeAi(accessToken, id, pjId);
      setAiAnalysis(res.analysis);
    } catch (err: any) {
      setAiError(err.message || "Analyse IA impossible");
    } finally {
      setAiLoading(false);
      setAnalyzingId(null);
    }
  };

  const handleAnalyzeAllPj = async () => {
    if (!accessToken || !id) return;
    setAnalyzingAll(true);
    setAiFilename("Toutes les pièces jointes");
    setAiError(null);
    setAiAnalysis(null);
    setAiOpen(true);
    setAiLoading(true);
    try {
      const res: any = await api.analyzeAllPiecesJointesAi(accessToken, id);
      setAiAnalysis(res.analysis);
      if (res.pieces?.some((p: any) => !p.ok)) {
        const fails = res.pieces
          .filter((p: any) => !p.ok)
          .map((p: any) => `${p.nomFichier}: ${p.error}`)
          .join("\n");
        if (fails) setAiError(`Certaines PJ n'ont pas pu être lues :\n${fails}`);
      }
    } catch (err: any) {
      setAiError(err.message || "Analyse croisée impossible");
    } finally {
      setAiLoading(false);
      setAnalyzingAll(false);
    }
  };

  const handleAcceptAiAction = async (code: string) => {
    if (!accessToken) return;
    try {
      await api.acceptAiSuggestion(accessToken, {
        actionCode: code,
        courrierId: id,
      });
    } catch {
      /* ignore */
    }
  };

  const handleAiDraft = async (resume: string, objet?: string) => {
    if (!accessToken) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const draft: any = await api.aiDraft(accessToken, {
        resume,
        objet: objet || courrier?.objet,
      });
      setAiAnalysis((prev) =>
        prev
          ? {
              ...prev,
              ocrResult: {
                ...prev.ocrResult,
                resumeAI: `${prev.ocrResult?.resumeAI || ""}\n\n— Brouillon proposé —\n${draft.sujetPropose}\n\n${draft.corpsPropose}`,
              },
            }
          : prev
      );
      await api.acceptAiSuggestion(accessToken, {
        actionCode: "draft_from_analysis",
        courrierId: id,
      });
    } catch (err: any) {
      setAiError(err.message || "Rédaction assistée impossible");
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <AppShell>
          <div className="flex items-center justify-center py-24">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </AppShell>
      </AuthGuard>
    );
  }

  if (error || !courrier) {
    return (
      <AuthGuard>
        <AppShell>
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <p className="text-destructive">{error || "Courrier introuvable"}</p>
            <Button variant="outline" onClick={() => router.push("/inbox")}>
              Retour à la boîte de réception
            </Button>
          </div>
        </AppShell>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <AppShell>
        <div className="flex flex-col gap-6 animate-fade-in max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{courrier.reference}</h1>
                <p className="text-sm text-muted-foreground">{courrier.objet}</p>
              </div>
            </div>
            <Badge variant={statusConfig[courrier.statut]?.variant ?? "default"}>
              {statusConfig[courrier.statut]?.label ?? courrier.statut}
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Détails du courrier</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Référence</p>
                    <p className="font-mono">{courrier.reference}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Type</p>
                    <p className="capitalize">{courrier.typeCourrier}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Date de création</p>
                    <p>{formatDate(courrier.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Date d&apos;envoi</p>
                    <p>{formatDate(courrier.dateEnvoi)}</p>
                  </div>
                </div>

                {courrier.corps && (
                  <div className="border-t pt-4">
                    <p className="text-muted-foreground text-sm mb-2">Contenu</p>
                    <div className="text-sm whitespace-pre-wrap bg-secondary/50 rounded-lg p-4">
                      {courrier.corps}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex flex-col gap-6">
              <Card>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground text-xs">Émetteur</p>
                      <p className="font-medium">
                        {courrier.emetteur
                          ? `${courrier.emetteur.prenom} ${courrier.emetteur.nom}`
                          : "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground text-xs">Direction émettrice</p>
                      <p className="font-medium">{courrier.directionEmetteur?.nom || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground text-xs">Direction destinataire</p>
                      <p className="font-medium">{courrier.destinataireDirection?.nom || "—"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <AttachmentsPanel
                  attachments={courrier.piecesJointes || []}
                  canUpload={
                    courrier.statut !== "archive" && courrier.emetteur?.id === user?.id
                  }
                  canDelete={courrier.emetteur?.id === user?.id}
                  uploading={pjUploading}
                  onUpload={handleUploadPj}
                  onDownload={handleDownload}
                  onDelete={handleDeletePj}
                  onAnalyze={canUseAi ? handleAnalyzePj : undefined}
                  onAnalyzeAll={canUseAi ? handleAnalyzeAllPj : undefined}
                  analyzingId={analyzingId}
                  analyzingAll={analyzingAll}
                />
                {pjError && (
                  <p className="text-xs text-destructive whitespace-pre-line bg-destructive/10 rounded-lg px-3 py-2">
                    {pjError}
                  </p>
                )}
              </div>
            </div>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Historique
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {courrier.historique.map((etape) => (
                  <div key={etape.id} className="flex items-center gap-4 px-6 py-3">
                    <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {actionLabels[etape.action] || etape.action}
                      </p>
                      {etape.commentaire && (
                        <p className="text-xs text-muted-foreground">{etape.commentaire}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(etape.dateAction)}
                    </span>
                  </div>
                ))}
                {courrier.historique.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Aucun historique
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <MessagePanel courrierId={id} statut={courrier.statut} />

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {courrier.statut === "brouillon" && (
                <div className="flex gap-3">
                  <Button onClick={handleEnvoyer} disabled={actionLoading}>
                    <Send className="h-4 w-4 mr-2" />
                    Envoyer
                  </Button>
                  <Button variant="destructive" onClick={handleSupprimer} disabled={actionLoading}>
                    Supprimer
                  </Button>
                </div>
              )}

              {courrier.statut !== "brouillon" && courrier.statut !== "archive" && (
                <div className="space-y-4">
                  {user?.directionId === courrier.destinataireDirection?.id ? (
                    <div className="space-y-3">
                      <div className="flex items-end gap-4">
                        <div className="flex-1 space-y-2">
                          <Label>Transmettre à (même ministère)</Label>
                          <Select
                            value={selectedDirectionId?.toString() || ""}
                            onValueChange={(v) => setSelectedDirectionId(v ? Number(v) : null)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner une direction" />
                            </SelectTrigger>
                            <SelectContent>
                              {directions
                                .filter((d) => d.id !== user?.directionId)
                                .map((d) => (
                                  <SelectItem key={d.id} value={d.id.toString()}>
                                    {d.nom}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Toute direction peut transmettre, uniquement en interne
                            {user?.ministereNom ? ` dans « ${user.ministereNom} »` : ""}.
                          </p>
                        </div>
                        <Button
                          onClick={handleTransmettre}
                          disabled={actionLoading || !selectedDirectionId}
                        >
                          <Forward className="h-4 w-4 mr-2" />
                          Transmettre
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Seule la direction destinataire actuelle peut transmettre ce courrier.
                    </p>
                  )}

                  {courrier.statut === "envoye" && user?.directionId === courrier.destinataireDirection?.id && (
                    <Button onClick={handleRecevoir} disabled={actionLoading} variant="outline">
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Marquer comme reçu
                    </Button>
                  )}

                  {canArchive && (
                    <Button onClick={() => setArchiveOpen(true)} disabled={actionLoading} variant="outline">
                      <Archive className="h-4 w-4 mr-2 text-orange-400" />
                      Archiver
                    </Button>
                  )}
                </div>
              )}

              {courrier.statut === "archive" && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Ce courrier est archivé
                    {courrier.archive?.dureeConservation
                      ? ` pour ${courrier.archive.dureeConservation} ans`
                      : ""}
                    {courrier.archive?.emplacement
                      ? ` — ${courrier.archive.emplacement}`
                      : ""}
                    .
                  </p>
                  {canArchive && courrier.archive?.id && (
                    <Button onClick={handleDesarchiver} disabled={actionLoading} variant="outline">
                      <Undo2 className="h-4 w-4 mr-2 text-orange-400" />
                      Désarchiver
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <ArchiveDialog
          open={archiveOpen}
          onOpenChange={setArchiveOpen}
          onConfirm={handleArchiver}
          loading={actionLoading}
          courrierRef={courrier?.reference}
        />

        <AiAnalysisDialog
          open={aiOpen}
          onOpenChange={setAiOpen}
          loading={aiLoading}
          error={aiError}
          filename={aiFilename}
          analysis={aiAnalysis}
          onAcceptAction={handleAcceptAiAction}
          onDraft={handleAiDraft}
        />
      </AppShell>
    </AuthGuard>
  );
}
