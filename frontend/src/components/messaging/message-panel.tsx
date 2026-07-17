"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  MessageSquare,
  Send,
  Wifi,
  WifiOff,
  Paperclip,
  FileText,
  Image,
  File,
  X,
  Loader2,
} from "lucide-react";
import { useMessages, MessageAttachment } from "@/lib/use-messages";
import { useAuthStore } from "@/lib/auth-store";
import { api } from "@/lib/api";

interface MessagePanelProps {
  courrierId: number;
  statut: string;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitials(prenom: string | null, nom: string | null) {
  const p = prenom?.[0] || "";
  const n = nom?.[0] || "";
  return (p + n).toUpperCase() || "?";
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / 1048576).toFixed(1)} Mo`;
}

function getFileIcon(typeMime: string | null) {
  if (!typeMime) return File;
  if (typeMime.startsWith("image/")) return Image;
  if (typeMime === "application/pdf") return FileText;
  return File;
}

export function MessagePanel({ courrierId, statut }: MessagePanelProps) {
  const { user, accessToken } = useAuthStore();
  const { messages, loading, connected, sendMessage } = useMessages(courrierId);
  const [input, setInput] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef(input);
  inputRef.current = input;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const doSend = useCallback(
    async (text: string, files: File[]) => {
      if ((!text.trim() && files.length === 0) || sending) return;
      setSending(true);
      setUploadError(null);
      try {
        const result = await sendMessage(text, files.length > 0 ? files : undefined);
        if (result) {
          setInput("");
          setPendingFiles([]);
        }
      } catch (err: any) {
        console.error("Erreur envoi:", err);
        setUploadError(err.message || "Erreur lors de l'envoi");
        // Garder les fichiers en attente pour pouvoir réessayer
        if (files.length > 0) {
          setPendingFiles((prev) => {
            const names = new Set(prev.map((f) => `${f.name}-${f.size}`));
            const missing = files.filter((f) => !names.has(`${f.name}-${f.size}`));
            return missing.length ? [...prev, ...missing] : prev;
          });
        }
      } finally {
        setSending(false);
      }
    },
    [sendMessage, sending]
  );

  const handleSend = () => {
    void doSend(input, pendingFiles);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const selected = Array.from(files);
    if (fileInputRef.current) fileInputRef.current.value = "";

    // Envoi immédiat dès la sélection du fichier (+ texte saisi s'il y en a)
    void doSend(inputRef.current, selected);
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDownload = async (msg: { id: number; courrierId: number }, pj: MessageAttachment) => {
    if (!accessToken) {
      setUploadError("Session expirée. Veuillez vous reconnecter.");
      return;
    }
    setUploadError(null);
    try {
      await api.downloadMessageAttachment(accessToken, msg.courrierId, msg.id, pj.id, pj.nomFichier);
    } catch (err: any) {
      console.error("Erreur téléchargement:", err);
      setUploadError(err.message || "Impossible de télécharger le fichier");
    }
  };

  const isArchived = statut === "archive";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Conversation
          <span className="ml-auto flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
            {connected ? (
              <>
                <Wifi className="h-3 w-3 text-green-500" />
                En ligne
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 text-muted-foreground" />
                Hors ligne
              </>
            )}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div
          ref={scrollRef}
          className="max-h-80 overflow-y-auto px-6 py-4 space-y-4"
        >
          {loading && messages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Chargement...
            </p>
          )}

          {!loading && messages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun message. Commencez la conversation.
            </p>
          )}

          {messages.map((msg) => {
            const isMine = msg.utilisateurId === user?.id;
            const hasText = Boolean(msg.contenu?.trim());
            const attachments = msg.piecesJointes ?? [];
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isMine ? "flex-row-reverse" : ""}`}
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="text-xs">
                    {getInitials(msg.utilisateurPrenom, msg.utilisateurNom)}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={`max-w-[75%] ${isMine ? "items-end" : "items-start"} flex flex-col`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium">
                      {isMine
                        ? "Vous"
                        : `${msg.utilisateurPrenom || ""} ${msg.utilisateurNom || ""}`.trim()}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(msg.createdAt)}
                    </span>
                  </div>
                  <div
                    className={`text-sm rounded-xl px-4 py-2.5 ${
                      isMine
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {hasText && <p>{msg.contenu.trim()}</p>}

                    {attachments.length > 0 && (
                      <div className={`space-y-1 ${hasText ? "mt-2 border-t pt-2" : ""}`}>
                        {attachments.map((pj) => {
                          const IconComponent = getFileIcon(pj.typeMime);
                          return (
                            <button
                              key={pj.id}
                              type="button"
                              onClick={() => handleDownload(msg, pj)}
                              className={`flex items-center gap-2 w-full text-left text-xs rounded-lg px-3 py-2 transition-colors ${
                                isMine
                                  ? "hover:bg-primary-foreground/20"
                                  : "hover:bg-background/50"
                              }`}
                            >
                              <IconComponent className="h-4 w-4 shrink-0" />
                              <span className="truncate flex-1">{pj.nomFichier}</span>
                              <span className="opacity-60 shrink-0">
                                {formatFileSize(pj.tailleBytes)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!isArchived && (
          <div className="border-t px-6 py-4 space-y-3">
            {uploadError && (
              <div className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2 whitespace-pre-line">
                {uploadError}
              </div>
            )}
            {pendingFiles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {pendingFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center gap-1.5 text-xs bg-secondary rounded-lg px-3 py-1.5"
                  >
                    <FileText className="h-3 w-3" />
                    <span className="truncate max-w-[150px]">{file.name}</span>
                    <span className="text-muted-foreground">{formatFileSize(file.size)}</span>
                    <button
                      type="button"
                      onClick={() => removePendingFile(index)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.txt,.csv,.rtf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={sending}
                onClick={() => fileInputRef.current?.click()}
                title="Joindre et envoyer un fichier"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Paperclip className="h-4 w-4" />
                )}
              </Button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Écrire un message ou joindre un fichier..."
                rows={1}
                disabled={sending}
                className="flex-1 resize-none rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground disabled:opacity-50"
              />
              <Button
                type="button"
                size="icon"
                onClick={handleSend}
                disabled={(!input.trim() && pendingFiles.length === 0) || sending}
                title="Envoyer"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}

        {isArchived && (
          <div className="border-t px-6 py-3">
            <p className="text-xs text-muted-foreground text-center">
              Ce courrier est archivé — la conversation est en lecture seule.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
