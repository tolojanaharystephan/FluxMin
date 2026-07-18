"use client";

import React, { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

export interface PublicationMessage {
  id: number;
  contenu: string;
  createdAt: string;
  utilisateurId: number;
  utilisateurNom?: string | null;
  utilisateurPrenom?: string | null;
  role?: string | null;
}

interface PublicationDiscussionProps {
  messages: PublicationMessage[];
  canWrite: boolean;
  readOnlyHint?: string;
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  sending?: boolean;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitials(prenom?: string | null, nom?: string | null) {
  return `${prenom?.[0] || ""}${nom?.[0] || ""}`.toUpperCase() || "?";
}

function roleLabel(role?: string | null) {
  if (role === "gouvernement") return "Gouvernement";
  if (role === "directeur_ministere" || role === "admin_ministere") return "Directeur";
  return null;
}

export function PublicationDiscussion({
  messages,
  canWrite,
  readOnlyHint,
  value,
  onChange,
  onSend,
  sending,
}: PublicationDiscussionProps) {
  const { user } = useAuthStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !sending) onSend();
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-fuchsia-400" />
          Discussion
          <span className="ml-auto text-[11px] font-normal text-muted-foreground">
            {messages.length} message{messages.length !== 1 ? "s" : ""}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div
          ref={scrollRef}
          className="max-h-96 min-h-[220px] overflow-y-auto px-4 sm:px-6 py-4 space-y-4 bg-gradient-to-b from-secondary/20 to-transparent"
        >
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-secondary border border-border/60">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Aucun message</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
                {canWrite
                  ? "Commencez la conversation officielle entre le Gouvernement et le ministère."
                  : "Les échanges apparaîtront ici."}
              </p>
            </div>
          )}

          {messages.map((msg) => {
            const isMine = msg.utilisateurId === user?.id;
            const label = roleLabel(msg.role);
            const name = isMine
              ? "Vous"
              : `${msg.utilisateurPrenom || ""} ${msg.utilisateurNom || ""}`.trim() || "Interlocuteur";

            return (
              <div
                key={msg.id}
                className={cn("flex gap-2.5", isMine ? "flex-row-reverse" : "flex-row")}
              >
                <Avatar className="h-8 w-8 shrink-0 mt-0.5">
                  <AvatarFallback
                    className={cn(
                      "text-[10px] font-semibold",
                      msg.role === "gouvernement"
                        ? "bg-rose-500/20 text-rose-300"
                        : "bg-fuchsia-500/15 text-fuchsia-300"
                    )}
                  >
                    {getInitials(msg.utilisateurPrenom, msg.utilisateurNom)}
                  </AvatarFallback>
                </Avatar>

                <div
                  className={cn(
                    "max-w-[78%] flex flex-col gap-1",
                    isMine ? "items-end" : "items-start"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center gap-2 flex-wrap",
                      isMine ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    <span className="text-xs font-medium">{name}</span>
                    {label && (
                      <span className="text-[10px] rounded-md border border-border/70 px-1.5 py-0.5 text-muted-foreground">
                        {label}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {formatDate(msg.createdAt)}
                    </span>
                  </div>

                  <div
                    className={cn(
                      "text-sm rounded-2xl px-3.5 py-2.5 shadow-sm whitespace-pre-wrap break-words",
                      isMine
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-card border border-border/70 text-foreground rounded-bl-md"
                    )}
                  >
                    {msg.contenu}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {canWrite ? (
          <div className="border-t border-border/60 px-4 sm:px-6 py-3 bg-card/80">
            <div className="flex items-end gap-2">
              <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Écrire un message… (Entrée pour envoyer)"
                rows={2}
                disabled={sending}
                className="flex-1 resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground disabled:opacity-50"
              />
              <Button
                type="button"
                size="icon"
                className="h-10 w-10 shrink-0 rounded-xl"
                disabled={!value.trim() || sending}
                onClick={onSend}
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
        ) : (
          <div className="border-t border-border/60 px-6 py-3">
            <p className="text-xs text-muted-foreground text-center">
              {readOnlyHint || "Discussion en lecture seule."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
