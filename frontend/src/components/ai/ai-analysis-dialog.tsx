"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Check,
  X,
  AlertTriangle,
  Loader2,
  Link2,
  FileText,
} from "lucide-react";

export interface ResumeStructure {
  accroche?: string;
  pointsCles?: string[];
  entites?: {
    references?: string[];
    dates?: string[];
    montants?: string[];
    emails?: string[];
  };
  texteAffichage?: string;
  texteCourt?: string;
}

export interface AiAnalysisPayload {
  langue?: string;
  scoreConfiance?: number;
  prioriteDetecte?: string;
  prioriteScore?: number;
  ocrResult?: {
    resumeAI?: string;
    resumeStructure?: ResumeStructure;
    texteExtrait?: { texteBrut?: string };
  };
  recommandations?: Array<{
    directionPropose: string;
    score: number;
    justification: string;
  }>;
  actionsProposees?: Array<{
    code: string;
    label: string;
    description: string;
    confiance: number;
  }>;
  objetPropose?: string | null;
  avertissement?: string;
  /** Bundle / multi-PJ */
  nbPieces?: number;
  coherenceScore?: number;
  relations?: Array<{
    fichierA: string;
    fichierB: string;
    scoreSimilarite: number;
    niveau: string;
    referencesCommunes?: string[];
    datesCommunes?: string[];
    montantsCommuns?: string[];
    motsClesCommuns?: string[];
  }>;
  alertes?: string[];
  entitesGlobales?: {
    references?: string[];
    dates?: string[];
    montants?: string[];
  };
  pieces?: Array<{
    nomFichier: string;
    resume?: ResumeStructure;
  }>;
}

interface AiAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading?: boolean;
  error?: string | null;
  filename?: string;
  analysis?: AiAnalysisPayload | null;
  onAcceptAction?: (code: string) => void;
  onApplyObjet?: (objet: string) => void;
  onDraft?: (resume: string, objet?: string) => void;
}

function SummaryBlock({ structure, fallback }: { structure?: ResumeStructure; fallback?: string }) {
  const accroche = structure?.accroche;
  const points = structure?.pointsCles || [];
  const entites = structure?.entites;

  if (!accroche && !points.length && fallback) {
    return (
      <div className="rounded-xl bg-secondary/40 p-4 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Synthèse
        </p>
        <div className="text-sm leading-relaxed whitespace-pre-line text-foreground/90">{fallback}</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-secondary/40 p-4 space-y-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
          Synthèse
        </p>
        <p className="text-sm font-medium leading-relaxed text-foreground">{accroche}</p>
      </div>

      {points.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
            Points clés
          </p>
          <ul className="space-y-1.5">
            {points.map((p, i) => (
              <li key={i} className="flex gap-2 text-sm leading-snug text-foreground/85">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(entites?.references?.length ||
        entites?.dates?.length ||
        entites?.montants?.length ||
        entites?.emails?.length) && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {entites?.references?.slice(0, 4).map((r) => (
            <Badge key={`ref-${r}`} variant="outline" className="text-[10px] font-normal">
              Réf. {r}
            </Badge>
          ))}
          {entites?.dates?.slice(0, 3).map((d) => (
            <Badge key={`d-${d}`} variant="secondary" className="text-[10px] font-normal">
              {d}
            </Badge>
          ))}
          {entites?.montants?.slice(0, 3).map((m) => (
            <Badge key={`m-${m}`} variant="outline" className="text-[10px] font-normal text-amber-300/90">
              {m}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export function AiAnalysisDialog({
  open,
  onOpenChange,
  loading,
  error,
  filename,
  analysis,
  onAcceptAction,
  onApplyObjet,
  onDraft,
}: AiAnalysisDialogProps) {
  const structure = analysis?.ocrResult?.resumeStructure;
  const resumeText =
    structure?.texteAffichage || analysis?.ocrResult?.resumeAI || "";
  const topRecs = analysis?.recommandations?.slice(0, 3) || [];
  const isBundle = (analysis?.nbPieces || 0) > 1 || (analysis?.relations?.length || 0) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/15">
              <Sparkles className="h-4 w-4 text-cyan-400" />
            </span>
            {isBundle ? "Analyse dossier (PJ)" : "Analyse IA"}
          </DialogTitle>
          <DialogDescription>
            {filename
              ? filename
              : isBundle
                ? `${analysis?.nbPieces || "—"} pièce(s) jointe(s)`
                : "Résultat de l’analyse locale"}
            {" — "}validation humaine obligatoire
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
            <p className="text-sm text-muted-foreground">
              {isBundle || filename?.includes("toutes")
                ? "Analyse croisée des pièces jointes…"
                : "Analyse en cours…"}
            </p>
          </div>
        )}

        {error && !loading && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive whitespace-pre-wrap">
            {error}
          </div>
        )}

        {analysis && !loading && (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Confiance {analysis.scoreConfiance ?? "—"}%</Badge>
              <Badge
                variant={
                  analysis.prioriteDetecte === "haute"
                    ? "destructive"
                    : analysis.prioriteDetecte === "moyenne"
                      ? "warning"
                      : "secondary"
                }
              >
                Priorité {analysis.prioriteDetecte || "—"}
              </Badge>
              {typeof analysis.coherenceScore === "number" && (
                <Badge variant="outline" className="border-teal-500/30 text-teal-300">
                  Cohérence {analysis.coherenceScore}%
                </Badge>
              )}
            </div>

            {analysis.avertissement && (
              <p className="flex items-start gap-2 text-xs text-amber-400/90">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                {analysis.avertissement}
              </p>
            )}

            {(analysis.alertes?.length || 0) > 0 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-200/80">
                  Alertes correspondance
                </p>
                {analysis.alertes!.map((a, i) => (
                  <p key={i} className="text-xs text-amber-100/90 leading-relaxed">
                    {a}
                  </p>
                ))}
              </div>
            )}

            <SummaryBlock structure={structure} fallback={resumeText} />

            {isBundle && (analysis.relations?.length || 0) > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <Link2 className="h-3 w-3" />
                  Correspondances entre fichiers
                </p>
                {analysis.relations!.slice(0, 6).map((r, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-border/50 px-3 py-2 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium leading-snug">
                        {r.fichierA} ↔ {r.fichierB}
                      </p>
                      <Badge
                        variant={
                          r.niveau === "forte"
                            ? "default"
                            : r.niveau === "moyenne"
                              ? "secondary"
                              : "outline"
                        }
                        className="text-[10px] shrink-0"
                      >
                        {r.scoreSimilarite}% · {r.niveau}
                      </Badge>
                    </div>
                    {(r.referencesCommunes?.length ||
                      r.datesCommunes?.length ||
                      r.motsClesCommuns?.length) && (
                      <p className="text-[11px] text-muted-foreground">
                        {[
                          r.referencesCommunes?.length
                            ? `Réf. ${r.referencesCommunes.slice(0, 2).join(", ")}`
                            : null,
                          r.datesCommunes?.length
                            ? `Dates ${r.datesCommunes.slice(0, 2).join(", ")}`
                            : null,
                          r.motsClesCommuns?.length
                            ? r.motsClesCommuns.slice(0, 4).join(", ")
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {isBundle && (analysis.pieces?.length || 0) > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <FileText className="h-3 w-3" />
                  Par pièce
                </p>
                {analysis.pieces!.map((p) => (
                  <div key={p.nomFichier} className="rounded-xl bg-secondary/25 px-3 py-2">
                    <p className="text-xs font-medium truncate">{p.nomFichier}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                      {p.resume?.accroche || "—"}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {analysis.objetPropose && (
              <div className="rounded-xl border border-border/60 p-3 space-y-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Objet proposé
                </p>
                <p className="font-medium">{analysis.objetPropose}</p>
                {onApplyObjet && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onApplyObjet(analysis.objetPropose!)}
                  >
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Utiliser comme base
                  </Button>
                )}
              </div>
            )}

            {topRecs.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Directions proposées
                </p>
                {topRecs.map((r) => (
                  <div
                    key={r.directionPropose}
                    className="rounded-xl border border-border/50 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm">{r.directionPropose}</p>
                      <Badge variant="outline">{r.score}%</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{r.justification}</p>
                    {onAcceptAction && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="mt-1 h-7 px-2"
                        onClick={() => onAcceptAction(`transmettre:${r.directionPropose}`)}
                      >
                        Marquer comme retenue
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {(analysis.actionsProposees?.length || 0) > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Actions suggérées
                </p>
                {analysis.actionsProposees!.map((a) => (
                  <div
                    key={a.code}
                    className="flex items-start justify-between gap-2 rounded-xl bg-secondary/30 px-3 py-2"
                  >
                    <div>
                      <p className="font-medium text-sm">{a.label}</p>
                      <p className="text-xs text-muted-foreground">{a.description}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[10px] text-muted-foreground">{a.confiance}%</span>
                      {onAcceptAction && (
                        <Button size="sm" variant="outline" onClick={() => onAcceptAction(a.code)}>
                          Accepter
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {analysis && onDraft && resumeText && (
            <Button
              variant="outline"
              onClick={() =>
                onDraft(
                  structure?.accroche || resumeText,
                  analysis.objetPropose || undefined,
                )
              }
            >
              Brouillon de réponse
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-1" />
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
