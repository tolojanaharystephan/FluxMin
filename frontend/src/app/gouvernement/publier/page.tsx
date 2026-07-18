"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { RBACGuard } from "@/components/auth/rbac-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/lib/auth-store";
import { api } from "@/lib/api";
import { PendingFilesZone } from "@/components/courrier/attachments-panel";
import { PenSquare } from "lucide-react";

export default function PublierPage() {
  const { accessToken } = useAuthStore();
  const router = useRouter();
  const [ministeres, setMinisteres] = useState<Array<{ id: number; nom: string }>>([]);
  const [titre, setTitre] = useState("");
  const [corps, setCorps] = useState("");
  const [typePublication, setTypePublication] = useState("communique");
  const [priorite, setPriorite] = useState("normale");
  const [portee, setPortee] = useState<"public" | "ministere">("public");
  const [ministereId, setMinistereId] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    api
      .getMinisteres(accessToken)
      .then((res: any) => {
        const list = Array.isArray(res) ? res : res.data || [];
        setMinisteres(list || []);
      })
      .catch(() => setMinisteres([]));
  }, [accessToken]);

  const submit = async (publier: boolean) => {
    if (!accessToken) return;
    if (titre.trim().length < 3) {
      setError("Titre trop court");
      return;
    }
    if (portee === "ministere" && !ministereId) {
      setError("Choisissez un ministère destinataire");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const pub: any = await api.createPublication(accessToken, {
        titre: titre.trim(),
        corps: corps.trim(),
        typePublication,
        priorite,
        portee,
        ministereId: portee === "ministere" ? Number(ministereId) : undefined,
        publier,
      });
      if (files.length > 0) {
        await api.uploadPublicationPjBatch(accessToken, pub.id, files);
      }
      router.push(`/actualites/${pub.id}`);
    } catch (e: any) {
      setError(e.message || "Erreur à la publication");
    } finally {
      setBusy(false);
    }
  };

  return (
    <RBACGuard allowedRoles={["gouvernement"]}>
      <AppShell>
        <div className="space-y-6 animate-fade-in max-w-2xl">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <PenSquare className="h-6 w-6 text-rose-300" />
              Publier une actualité
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Communiqué public ou communication adressée à un ministère.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Nouvelle publication</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div className="space-y-2">
                <Label>Titre</Label>
                <Input value={titre} onChange={(e) => setTitre(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Contenu</Label>
                <textarea
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[140px]"
                  value={corps}
                  onChange={(e) => setCorps(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={typePublication} onValueChange={setTypePublication}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="communique">Communiqué</SelectItem>
                      <SelectItem value="information">Information</SelectItem>
                      <SelectItem value="ordre">Ordre / mission</SelectItem>
                      <SelectItem value="alerte">Alerte</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priorité</Label>
                  <Select value={priorite} onValueChange={setPriorite}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normale">Normale</SelectItem>
                      <SelectItem value="haute">Haute</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Portée</Label>
                <Select
                  value={portee}
                  onValueChange={(v) => setPortee(v as "public" | "ministere")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Tous les ministères</SelectItem>
                    <SelectItem value="ministere">Un ministère spécifique</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {portee === "ministere" && (
                <div className="space-y-2">
                  <Label>Ministère destinataire</Label>
                  <Select value={ministereId} onValueChange={setMinistereId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir…" />
                    </SelectTrigger>
                    <SelectContent>
                      {ministeres.map((m) => (
                        <SelectItem key={m.id} value={String(m.id)}>
                          {m.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2 border-t pt-4">
                <Label>Pièces jointes (optionnel)</Label>
                <p className="text-xs text-muted-foreground">
                  Un ou plusieurs fichiers — PDF, Office, images, texte · max 50 Mo chacun
                </p>
                <PendingFilesZone files={files} onChange={setFiles} disabled={busy} />
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button disabled={busy} onClick={() => void submit(true)}>
                  Publier maintenant
                </Button>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => void submit(false)}
                >
                  Enregistrer brouillon
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    </RBACGuard>
  );
}
