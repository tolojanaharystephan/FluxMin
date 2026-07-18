"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth-store";
import { api } from "@/lib/api";
import { PendingFilesZone } from "@/components/courrier/attachments-panel";
import { PublicationDiscussion } from "@/components/gouvernement/publication-discussion";
import { Download, Paperclip, CheckCircle2 } from "lucide-react";

export default function ActualiteDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const { accessToken, user } = useAuthStore();
  const [pub, setPub] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [arComment, setArComment] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken || !id) return;
    try {
      const data = await api.getPublication(accessToken, id);
      setPub(data);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Impossible de charger la publication");
    }
  }, [accessToken, id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAr = async () => {
    if (!accessToken) return;
    setBusy(true);
    try {
      await api.accuseReceptionPublication(accessToken, id, arComment || undefined);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSend = async () => {
    if (!accessToken || !msg.trim()) return;
    setBusy(true);
    try {
      await api.sendPublicationMessage(accessToken, id, msg.trim());
      setMsg("");
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const canGouvReply = user?.role === "gouvernement" && pub?.portee === "ministere";
  const canUploadPj =
    user?.role === "gouvernement" && pub && pub.statut !== "archive";

  const handleUploadPj = async () => {
    if (!accessToken || pendingFiles.length === 0) return;
    setBusy(true);
    try {
      await api.uploadPublicationPjBatch(accessToken, id, pendingFiles);
      setPendingFiles([]);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthGuard>
    <AppShell>
      <div className="space-y-6 animate-fade-in max-w-3xl">
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
        )}
        {!pub && !error && <p className="text-sm text-muted-foreground">Chargement…</p>}

        {pub && (
          <>
            <div>
              <div className="flex flex-wrap gap-2 mb-2">
                <Badge variant="outline">{pub.typePublication}</Badge>
                <Badge variant="secondary">{pub.portee}</Badge>
                {pub.priorite !== "normale" && (
                  <Badge variant={pub.priorite === "urgente" ? "destructive" : "warning"}>
                    {pub.priorite}
                  </Badge>
                )}
                {pub.ministereNom && <Badge>{pub.ministereNom}</Badge>}
              </div>
              <h1 className="text-2xl font-bold tracking-tight">{pub.titre}</h1>
              <p className="text-xs text-muted-foreground mt-1">
                {pub.auteurPrenom} {pub.auteurNom}
                {pub.datePublication
                  ? ` · ${new Date(pub.datePublication).toLocaleString("fr-FR")}`
                  : ""}
              </p>
            </div>

            <Card>
              <CardContent className="pt-6">
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {pub.corps || "—"}
                </p>
              </CardContent>
            </Card>

            {((pub.piecesJointes?.length || 0) > 0 || canUploadPj) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Paperclip className="h-4 w-4" /> Pièces jointes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(pub.piecesJointes?.length || 0) === 0 && (
                    <p className="text-xs text-muted-foreground">Aucun document pour l’instant.</p>
                  )}
                  {pub.piecesJointes?.map((pj: any) => (
                    <div
                      key={pj.id}
                      className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm truncate">{pj.nomFichier}</p>
                        {pj.tailleBytes != null && (
                          <p className="text-[11px] text-muted-foreground">
                            {pj.tailleBytes < 1048576
                              ? `${(pj.tailleBytes / 1024).toFixed(1)} Ko`
                              : `${(pj.tailleBytes / 1048576).toFixed(1)} Mo`}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          accessToken &&
                          api.downloadPublicationPj(accessToken, id, pj.id, pj.nomFichier)
                        }
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}

                  {canUploadPj && (
                    <div className="space-y-2 pt-2 border-t border-border/60">
                      <PendingFilesZone
                        files={pendingFiles}
                        onChange={setPendingFiles}
                        disabled={busy}
                      />
                      {pendingFiles.length > 0 && (
                        <Button size="sm" disabled={busy} onClick={() => void handleUploadPj()}>
                          Joindre {pendingFiles.length} fichier
                          {pendingFiles.length > 1 ? "s" : ""}
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {pub.portee === "ministere" && (
              <>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Accusé de réception</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(pub.accuses?.length || 0) > 0 ? (
                      pub.accuses.map((a: any) => (
                        <div key={a.id} className="text-sm rounded-lg bg-secondary/40 px-3 py-2">
                          <p className="font-medium flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-teal-400" />
                            {a.utilisateurPrenom} {a.utilisateurNom}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {new Date(a.dateAr).toLocaleString("fr-FR")}
                          </p>
                          {a.commentaire && (
                            <p className="text-xs mt-1 text-muted-foreground">{a.commentaire}</p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">Aucun AR pour l’instant.</p>
                    )}

                    {pub.canReply && !pub.hasAr && (
                      <div className="space-y-2 pt-2 border-t border-border/60">
                        <textarea
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[70px]"
                          placeholder="Commentaire d’accusé (optionnel)"
                          value={arComment}
                          onChange={(e) => setArComment(e.target.value)}
                        />
                        <Button size="sm" disabled={busy} onClick={handleAr}>
                          Accuser réception
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <PublicationDiscussion
                  messages={pub.messages || []}
                  canWrite={Boolean(pub.canReply || canGouvReply) && pub.statut === "publie"}
                  readOnlyHint={
                    pub.statut !== "publie"
                      ? "Publication non publiée — discussion indisponible."
                      : "Seuls le Gouvernement et le directeur du ministère peuvent écrire."
                  }
                  value={msg}
                  onChange={setMsg}
                  onSend={() => void handleSend()}
                  sending={busy}
                />
              </>
            )}
          </>
        )}
      </div>
    </AppShell>
    </AuthGuard>
  );
}
