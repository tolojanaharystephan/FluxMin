"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "./auth-store";
import { api } from "./api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface MessageAttachment {
  id: number;
  messageId: number;
  nomFichier: string;
  cheminFichier: string;
  typeMime: string | null;
  tailleBytes: number | null;
  createdAt: string;
}

export interface Message {
  id: number;
  courrierId: number;
  utilisateurId: number;
  contenu: string;
  createdAt: string;
  utilisateurNom: string | null;
  utilisateurPrenom: string | null;
  piecesJointes: MessageAttachment[];
}

export function useMessages(courrierId: number | null) {
  const { accessToken, user } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchMessages = useCallback(async () => {
    if (!accessToken || !courrierId) return;
    setLoading(true);
    try {
      const res: any = await api.getMessages(accessToken, courrierId, 1, 100);
      setMessages(res.data || []);
      setTotal(res.pagination?.total || 0);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [accessToken, courrierId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (!accessToken || !user?.id || !courrierId) return;

    const socket = io(API_BASE, {
      query: { userId: user.id },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 3000,
    });

    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("message:new", (raw: Message & { utilisateur?: { nom?: string; prenom?: string } }) => {
      if (raw.courrierId === courrierId) {
        const message: Message = {
          ...raw,
          utilisateurNom: raw.utilisateurNom ?? raw.utilisateur?.nom ?? null,
          utilisateurPrenom: raw.utilisateurPrenom ?? raw.utilisateur?.prenom ?? null,
          piecesJointes: raw.piecesJointes ?? [],
        };
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
        setTotal((prev) => prev + 1);
      }
    });

    socket.on("message:attachment", (data: { messageId: number; attachment: MessageAttachment }) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === data.messageId) {
            const existing = m.piecesJointes ?? [];
            if (existing.some((a) => a.id === data.attachment.id)) return m;
            return { ...m, piecesJointes: [...existing, data.attachment] };
          }
          return m;
        })
      );
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken, user?.id, courrierId]);

  const sendMessage = useCallback(
    async (contenu: string, files?: File[]) => {
      if (!accessToken || !courrierId) {
        throw new Error("Session expirée. Veuillez vous reconnecter.");
      }
      const trimmed = contenu.trim();
      if (!trimmed && (!files || files.length === 0)) {
        throw new Error("Aucun contenu à envoyer.");
      }

      // Contenu visible si fichier seul (évite un message "invisible" + validation DTO)
      const messageContent =
        trimmed ||
        (files && files.length === 1
          ? `Fichier joint : ${files[0].name}`
          : files && files.length > 1
            ? `${files.length} fichiers joints`
            : "");

      const raw: any = await api.sendMessage(accessToken, courrierId, messageContent);
      const message: Message = {
        ...raw,
        utilisateurNom: raw.utilisateurNom ?? raw.utilisateur?.nom ?? null,
        utilisateurPrenom: raw.utilisateurPrenom ?? raw.utilisateur?.prenom ?? null,
        piecesJointes: raw.piecesJointes ?? [],
      };
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
      setTotal((prev) => prev + 1);

      const uploadErrors: string[] = [];

      if (files && files.length > 0) {
        for (const file of files) {
          try {
            const pj: any = await api.uploadMessageAttachment(accessToken, courrierId, message.id, file);
            setMessages((prev) =>
              prev.map((m) => {
                if (m.id === message.id) {
                  const existing = m.piecesJointes ?? [];
                  if (existing.some((a) => a.id === pj.id)) return m;
                  return { ...m, piecesJointes: [...existing, pj] };
                }
                return m;
              })
            );
          } catch (err: any) {
            console.error("Erreur upload fichier:", err);
            uploadErrors.push(`${file.name}: ${err.message || 'Erreur inconnue'}`);
          }
        }
      }

      if (uploadErrors.length > 0) {
        throw new Error(`Échec de l'envoi des fichiers:\n${uploadErrors.join('\n')}`);
      }

      return message;
    },
    [accessToken, courrierId]
  );

  return { messages, loading, connected, total, sendMessage, refetch: fetchMessages };
}
