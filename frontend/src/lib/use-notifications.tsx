"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "./auth-store";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface AppNotification {
  id: number;
  type: string;
  titre: string;
  message: string | null;
  courrierId: number | null;
  publicationId?: number | null;
  lu?: boolean;
  createdAt?: string;
}

/** Cible de navigation pour une notification (courrier ou publication gouv). */
export function notificationHref(n: {
  courrierId?: number | null;
  publicationId?: number | null;
}): string | null {
  if (n.publicationId) return `/actualites/${n.publicationId}`;
  if (n.courrierId) return `/courriers/${n.courrierId}`;
  return null;
}

interface NotificationsContextValue {
  unreadCount: number;
  latestNotification: AppNotification | null;
  connected: boolean;
  refetchUnread: () => Promise<void>;
  dismissToast: () => void;
  decrementUnread: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { accessToken, user } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestNotification, setLatestNotification] = useState<AppNotification | null>(null);
  const [connected, setConnected] = useState(false);

  const refetchUnread = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch(`${API_BASE}/api/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count ?? 0);
      }
    } catch {
      /* ignore */
    }
  }, [accessToken]);

  useEffect(() => {
    refetchUnread();
  }, [refetchUnread]);

  useEffect(() => {
    if (!accessToken || !user?.id) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
      return;
    }

    const socket = io(API_BASE, {
      auth: { token: accessToken },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 3000,
    });

    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("notification", (notification: AppNotification) => {
      setLatestNotification(notification);
      setUnreadCount((prev) => prev + 1);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken, user?.id]);

  const dismissToast = useCallback(() => setLatestNotification(null), []);
  const decrementUnread = useCallback(() => {
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  return (
    <NotificationsContext.Provider
      value={{
        unreadCount,
        latestNotification,
        connected,
        refetchUnread,
        dismissToast,
        decrementUnread,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    return {
      unreadCount: 0,
      latestNotification: null,
      connected: false,
      refetchUnread: async () => {},
      dismissToast: () => {},
      decrementUnread: () => {},
    } satisfies NotificationsContextValue;
  }
  return ctx;
}
