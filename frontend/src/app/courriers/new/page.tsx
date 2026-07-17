"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AuthGuard } from "@/components/auth/auth-guard";
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
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, Save } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { PendingFilesZone } from "@/components/courrier/attachments-panel";

interface Direction {
  id: number;
  nom: string;
  ministereId: number;
}

interface Ministere {
  id: number;
  nom: string;
  code: string;
}

export default function NewCourrierPage() {
  const router = useRouter();
  const { accessToken, user } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [ministeres, setMinisteres] = useState<Ministere[]>([]);
  const [directions, setDirections] = useState<Direction[]>([]);

  const [typeCourrier, setTypeCourrier] = useState("interne");
  const [selectedMinistereId, setSelectedMinistereId] = useState<number | null>(null);
  const [objet, setObjet] = useState("");
  const [corps, setCorps] = useState("");
  const [destinataireDirectionId, setDestinataireDirectionId] = useState<number | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    api.getMinisteres(accessToken).then((data: any) => setMinisteres(data || [])).catch(() => {});
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;

    if (typeCourrier === "externe" && selectedMinistereId) {
      api
        .getDirections(accessToken, selectedMinistereId)
        .then((data: any) => setDirections(data || []))
        .catch(() => setDirections([]));
    } else if (typeCourrier === "interne") {
      // Uniquement les directions du ministère de l'expéditeur
      const ownMinistereId = user?.ministereId;
      if (ownMinistereId) {
        api
          .getDirections(accessToken, ownMinistereId)
          .then((data: any) => setDirections(data || []))
          .catch(() => setDirections([]));
      } else {
        setDirections([]);
      }
    } else {
      setDirections([]);
    }
    setDestinataireDirectionId(null);
  }, [accessToken, typeCourrier, selectedMinistereId, user?.ministereId]);

  const handleSave = async (envoyer?: boolean) => {
    if (!accessToken || !objet || !destinataireDirectionId) return;
    setLoading(true);
    setFormError(null);
    try {
      const courrier: any = await api.createCourrier(accessToken, {
        objet,
        corps: corps || undefined,
        typeCourrier,
        destinataireDirectionId,
        ministereDestinataireId: typeCourrier === "externe" ? selectedMinistereId || undefined : undefined,
      });

      if (courrier?.id && files.length > 0) {
        const uploadErrors: string[] = [];
        for (const file of files) {
          try {
            await api.uploadPieceJointe(accessToken, courrier.id, file);
          } catch (err: any) {
            uploadErrors.push(`${file.name}: ${err.message || "échec"}`);
          }
        }
        if (uploadErrors.length) {
          setFormError(`Courrier créé, mais certains fichiers ont échoué:\n${uploadErrors.join("\n")}`);
          router.push(`/courriers/${courrier.id}`);
          return;
        }
      }

      if (envoyer && courrier?.id) {
        await api.envoyerCourrier(accessToken, courrier.id);
      }
      router.push(envoyer ? "/sent" : "/drafts");
    } catch (err: any) {
      setFormError(err.message || "Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <RBACGuard
        allowedRoles={["agent_courrier", "responsable", "responsable_direction", "admin_ministere"]}
      >
      <AppShell>
        <div className="flex flex-col gap-6 animate-fade-in max-w-3xl mx-auto">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Nouveau courrier</h1>
              <p className="text-sm text-muted-foreground">Créer et envoyer un courrier</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Informations du courrier</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="objet">Objet *</Label>
                <Input
                  id="objet"
                  placeholder="Objet du courrier"
                  value={objet}
                  onChange={(e) => setObjet(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type de courrier</Label>
                <Select value={typeCourrier} onValueChange={setTypeCourrier}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="interne">Interne (même ministère)</SelectItem>
                    <SelectItem value="externe">Externe (inter-ministériel)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="corps">Corps du message</Label>
                <Textarea
                  id="corps"
                  placeholder="Contenu du courrier..."
                  rows={8}
                  value={corps}
                  onChange={(e) => setCorps(e.target.value)}
                />
              </div>

              <div className="border-t pt-6">
                <h3 className="text-sm font-semibold mb-4">Destination</h3>

                {typeCourrier === "externe" && (
                  <div className="space-y-2 mb-4">
                    <Label>Ministère destination *</Label>
                    <Select
                      value={selectedMinistereId?.toString() || ""}
                      onValueChange={(v) => {
                        setSelectedMinistereId(v ? Number(v) : null);
                        setDestinataireDirectionId(null);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un ministère" />
                      </SelectTrigger>
                      <SelectContent>
                        {ministeres
                          .filter((m) => m.id !== user?.ministereId)
                          .map((m) => (
                            <SelectItem key={m.id} value={m.id.toString()}>
                              {m.code ? `${m.code} - ${m.nom}` : m.nom}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {user?.ministereNom && (
                      <p className="text-xs text-muted-foreground">
                        Votre ministère (« {user.ministereNom} ») est exclu — un courrier externe vise un autre ministère.
                      </p>
                    )}
                  </div>
                )}

                {typeCourrier === "interne" && (
                  <p className="text-xs text-muted-foreground mb-4">
                    {user?.ministereNom
                      ? `Directions du ministère « ${user.ministereNom} » uniquement.`
                      : "Votre compte n'est rattaché à aucun ministère — impossible de choisir une direction interne."}
                  </p>
                )}

                <div className="space-y-2">
                  <Label>Direction destinataire *</Label>
                  <Select
                    value={destinataireDirectionId?.toString() || ""}
                    onValueChange={(v) => setDestinataireDirectionId(v ? Number(v) : null)}
                    disabled={
                      (typeCourrier === "externe" && !selectedMinistereId) ||
                      (typeCourrier === "interne" && !user?.ministereId)
                    }
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
                </div>
              </div>

              <div className="border-t pt-6 space-y-3">
                <h3 className="text-sm font-semibold">Pièces jointes</h3>
                <PendingFilesZone files={files} onChange={setFiles} disabled={loading} />
                {formError && (
                  <p className="text-xs text-destructive whitespace-pre-line bg-destructive/10 rounded-lg px-3 py-2">
                    {formError}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => handleSave(false)}
                  disabled={loading || !objet || !destinataireDirectionId}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Enregistrer brouillon
                </Button>
                <Button
                  onClick={() => handleSave(true)}
                  disabled={loading || !objet || !destinataireDirectionId}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {loading ? "Envoi..." : "Envoyer"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppShell>
      </RBACGuard>
    </AuthGuard>
  );
}
