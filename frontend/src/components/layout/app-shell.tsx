"use client";

import React from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NotificationsProvider } from "@/lib/use-notifications";
import { NotificationToast } from "@/components/notifications/notification-toast";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <NotificationsProvider>
      <TooltipProvider delayDuration={0}>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <TopBar />
            <main className="flex-1 overflow-y-auto p-6">{children}</main>
          </div>
          <NotificationToast />
        </div>
      </TooltipProvider>
    </NotificationsProvider>
  );
}
