"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AuthGuard } from "@/components/auth/auth-guard";
import { RBACGuard } from "@/components/auth/rbac-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Lightbulb,
  Clock,
  Zap,
  Target,
  RefreshCw,
  Server,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

const typeMeta: Record<
  string,
  { icon: React.ElementType; color: string; bg: string }
> = {
  urgent: { icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-500/10" },
  optimisation: { icon: Lightbulb, color: "text-sky-400", bg: "bg-sky-500/10" },
  classification: { icon: Target, color: "text-cyan-400", bg: "bg-cyan-500/10" },
  systeme: { icon: Server, color: "text-red-400", bg: "bg-red-500/10" },
  statistique: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
};

export default function AISuggestionsPage() {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<any>(null);
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftResult, setDraftResult] = useState<any>(null);
  const [draftObjet, setDraftObjet] = useState("");
  const [draftResume, setDraftResume] = useState("");

  const fetchData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAiSuggestions(accessToken);
      setPayload(data);
    } catch (err: any) {
      setError(err.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAction = async (suggestion: any, action: any) => {
    if (!accessToken) return;

    if (action.code === "ouvrir_draft") {
      setDraftOpen(true);
      return;
    }

    if (action.courrierId) {
      await api.acceptAiSuggestion(accessToken, {
        actionCode: action.code,
        courrierId: action.courrierId,
      });
      router.push(`/courriers/${action.courrierId}`);
      return;
    }

    if (action.courrierIds?.length) {
      await api.acceptAiSuggestion(accessToken, {
        actionCode: action.code,
        courrierId: action.courrierIds[0],
      });
      router.push(`/courriers/${action.courrierIds[0]}`);
      return;
    }

    await api.acceptAiSuggestion(accessToken, { actionCode: action.code });
  };

  const runDraft = async () => {
    if (!accessToken) return;
    setDraftLoading(true);
    try {
      const res = await api.aiDraft(accessToken, {
        objet: draftObjet || undefined,
        resume: draftResume || undefined,
      });
      setDraftResult(res);
      await api.acceptAiSuggestion(accessToken, { actionCode: "draft_generated" });
    } catch (err: any) {
      alert(err.message || "Erreur rédaction assistée");
    } finally {
      setDraftLoading(false);
    }
  };

  const suggestions = payload?.suggestions || [];
  const stats = payload?.stats;
  const ia = payload?.ia;

  return (
    <AuthGuard>
      <RBACGuard allowedRoles={["responsable", "agent_courrier", "responsable_direction", "directeur_ministere", "super_admin"]}>
        <AppShell>
          <div className="flex flex-col gap-6 animate-fade-in">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-2xl font-semibold tracking-[-0.02em] flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15">
                    <Sparkles className="h-5 w-5 text-cyan-400" />
                  </span>
                  Suggestions IA
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Assistant local — propositions à valider, sans service cloud tiers
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={fetchData}>
                <RefreshCw className="h-4 w-4" />
                Actualiser
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="border-white/10 bg-white/5">
                <CardContent className="p-4 flex items-center gap-3">
                  <Server className={`h-5 w-5 ${ia?.status === "ok" ? "text-emerald-400" : "text-red-400"}`} />
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Service IA</p>
                    <p className="text-sm font-semibold">
                      {ia?.status === "ok" ? "En ligne" : "Hors ligne"}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-white/5">
                <CardContent className="p-4 flex items-center gap-3">
                  <Zap className="h-5 w-5 text-amber-400" />
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Courriers actifs</p>
                    <p className="text-sm font-semibold">{stats?.courriersActifs ?? "—"}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-white/5">
                <CardContent className="p-4 flex items-center gap-3">
                  <Clock className="h-5 w-5 text-sky-400" />
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Retards +48h</p>
                    <p className="text-sm font-semibold">{stats?.retards48h ?? "—"}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-white/5">
                <CardContent className="p-4 flex items-center gap-3">
                  <Target className="h-5 w-5 text-cyan-400" />
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Avec PJ</p>
                    <p className="text-sm font-semibold">{stats?.avecPiecesJointes ?? "—"}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <Card className="border-white/10 bg-white/5">
                <CardContent className="py-12 text-center">
                  <p className="text-sm text-destructive">{error}</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={fetchData}>
                    Réessayer
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col gap-4">
                {suggestions.map((s: any) => {
                  const meta = typeMeta[s.type] || typeMeta.optimisation;
                  const Icon = meta.icon;
                  return (
                    <Card key={s.id} className={`border-white/10 bg-white/5 ${meta.bg}`}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-3">
                          <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${meta.bg}`}>
                            <Icon className={`h-4 w-4 ${meta.color}`} />
                          </span>
                          <span className="flex-1">{s.title}</span>
                          {typeof s.confiance === "number" && (
                            <Badge variant="outline">{s.confiance}%</Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm text-muted-foreground">{s.description}</p>
                        {s.items?.length > 0 && (
                          <ul className="text-xs text-muted-foreground space-y-1">
                            {s.items.slice(0, 4).map((it: any) => (
                              <li key={it.id} className="font-mono">
                                {it.reference} — {it.objet}
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {(s.actions || []).map((a: any) => (
                            <Button
                              key={a.code + (a.label || "")}
                              size="sm"
                              variant="outline"
                              onClick={() => handleAction(s, a)}
                            >
                              {a.label}
                            </Button>
                          ))}
                          {s.id === "assist-draft" && (
                            <Button size="sm" onClick={() => setDraftOpen(true)}>
                              Rédaction assistée
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {suggestions.length === 0 && (
                  <Card className="border-white/10 bg-white/5">
                    <CardContent className="py-12 text-center text-sm text-muted-foreground">
                      Aucune suggestion pour le moment
                    </CardContent>
                  </Card>
                )}
                {payload?.avertissement && (
                  <p className="text-xs text-muted-foreground text-center">{payload.avertissement}</p>
                )}
              </div>
            )}
          </div>

          <Dialog open={draftOpen} onOpenChange={setDraftOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Rédaction assistée</DialogTitle>
                <DialogDescription>
                  Gabarit local d’accusé de réception — à relire avant tout envoi.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 py-2">
                <div className="grid gap-2">
                  <Label>Objet</Label>
                  <Input value={draftObjet} onChange={(e) => setDraftObjet(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Résumé / éléments</Label>
                  <Input value={draftResume} onChange={(e) => setDraftResume(e.target.value)} />
                </div>
                {draftResult && (
                  <div className="rounded-xl bg-secondary/40 p-3 space-y-2 text-sm">
                    <p className="font-medium">{draftResult.sujetPropose}</p>
                    <pre className="whitespace-pre-wrap text-xs text-muted-foreground font-sans">
                      {draftResult.corpsPropose}
                    </pre>
                    <p className="text-[10px] text-amber-400">{draftResult.avertissement}</p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDraftOpen(false)}>
                  Fermer
                </Button>
                <Button onClick={runDraft} disabled={draftLoading}>
                  {draftLoading ? "Génération…" : "Générer"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </AppShell>
      </RBACGuard>
    </AuthGuard>
  );
}
