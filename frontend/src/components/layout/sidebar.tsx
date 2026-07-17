"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuthStore } from "@/lib/auth-store";
import {
  Mail,
  Inbox,
  Send,
  FileText,
  Archive,
  Settings,
  Users,
  Building2,
  ChevronLeft,
  ChevronRight,
  Shield,
  BarChart3,
  Sparkles,
  ClipboardList,
  FileSearch,
  AlertTriangle,
  LayoutDashboard,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  roles?: string[];
  /** Couleur icône (Tailwind) — style SaaS coloré */
  iconColor?: string;
  iconBg?: string;
}

const dashboardNav: NavItem[] = [
  {
    label: "Tableau de bord",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["super_admin", "admin_ministere", "responsable", "responsable_direction", "agent_courrier"],
    iconColor: "text-sky-400",
    iconBg: "bg-sky-500/15",
  },
];

const messagerieNav: NavItem[] = [
  {
    label: "Boîte de réception",
    href: "/inbox",
    icon: Inbox,
    roles: ["agent_courrier", "responsable", "responsable_direction", "admin_ministere"],
    iconColor: "text-teal-400",
    iconBg: "bg-teal-500/15",
  },
  {
    label: "Courriers envoyés",
    href: "/sent",
    icon: Send,
    roles: ["agent_courrier", "responsable", "responsable_direction", "admin_ministere"],
    iconColor: "text-emerald-400",
    iconBg: "bg-emerald-500/15",
  },
  {
    label: "Brouillons",
    href: "/drafts",
    icon: FileText,
    roles: ["agent_courrier", "responsable", "responsable_direction", "admin_ministere"],
    iconColor: "text-amber-400",
    iconBg: "bg-amber-500/15",
  },
  {
    label: "Archives",
    href: "/archives",
    icon: Archive,
    roles: ["agent_courrier", "responsable", "responsable_direction", "admin_ministere", "auditeur"],
    iconColor: "text-orange-400",
    iconBg: "bg-orange-500/15",
  },
];

const iaNav: NavItem[] = [
  {
    label: "Suggestions IA",
    href: "/ai/suggestions",
    icon: Sparkles,
    roles: ["responsable", "agent_courrier", "responsable_direction"],
    iconColor: "text-cyan-400",
    iconBg: "bg-cyan-500/15",
  },
];

const adminNav: NavItem[] = [
  {
    label: "Ministères",
    href: "/admin/ministeres",
    icon: Building2,
    roles: ["super_admin", "admin_ministere"],
    iconColor: "text-indigo-400",
    iconBg: "bg-indigo-500/15",
  },
  {
    label: "Directions",
    href: "/admin/directions",
    icon: Users,
    roles: ["super_admin", "admin_ministere", "agent_courrier"],
    iconColor: "text-violet-400",
    iconBg: "bg-violet-500/15",
  },
  {
    label: "Utilisateurs",
    href: "/admin/utilisateurs",
    icon: Shield,
    roles: ["super_admin", "admin_ministere"],
    iconColor: "text-rose-400",
    iconBg: "bg-rose-500/15",
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    roles: ["super_admin", "admin_ministere", "responsable", "responsable_direction", "auditeur"],
    iconColor: "text-blue-400",
    iconBg: "bg-blue-500/15",
  },
];

const auditNav: NavItem[] = [
  {
    label: "Recherche avancée",
    href: "/audit/search",
    icon: FileSearch,
    roles: ["auditeur", "super_admin"],
    iconColor: "text-lime-400",
    iconBg: "bg-lime-500/15",
  },
  {
    label: "Rapports d'audit",
    href: "/audit/reports",
    icon: ClipboardList,
    roles: ["auditeur", "super_admin"],
    iconColor: "text-yellow-400",
    iconBg: "bg-yellow-500/15",
  },
  {
    label: "Anomalies",
    href: "/audit/anomalies",
    icon: AlertTriangle,
    roles: ["auditeur", "super_admin", "responsable", "responsable_direction"],
    iconColor: "text-red-400",
    iconBg: "bg-red-500/15",
  },
];

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Administrateur",
  admin_ministere: "Admin Ministère",
  agent_courrier: "Agent Courrier",
  responsable: "Responsable",
  responsable_direction: "Responsable Direction",
  auditeur: "Auditeur",
};

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { user } = useAuthStore();

  const userRole = user?.role || "agent";

  const hasRole = (roles?: string[]) => {
    if (!roles || roles.length === 0) return true;
    return roles.includes(userRole);
  };

  const visibleDashboard = dashboardNav.filter((item) => hasRole(item.roles));
  const visibleMessagerie = messagerieNav.filter((item) => hasRole(item.roles));
  const visibleIa = iaNav.filter((item) => hasRole(item.roles));
  const visibleAdmin = adminNav.filter((item) => hasRole(item.roles));
  const visibleAudit = auditNav.filter((item) => hasRole(item.roles));

  const showDashboardSection = visibleDashboard.length > 0;
  const showMessagerieSection = visibleMessagerie.length > 0;
  const showAdminSection = visibleAdmin.length > 0;
  const showAuditSection = visibleAudit.length > 0;
  const showIaSection = visibleIa.length > 0;

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "relative flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ease-in-out",
          collapsed ? "w-[68px]" : "w-[260px]"
        )}
      >
        <div className="flex h-16 items-center gap-3 px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-sky-500 text-white shadow-lg shadow-teal-500/25">
            <Mail className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-foreground">
                FluxMin
              </span>
              <span className="text-[10px] text-muted-foreground">
                {ROLE_LABELS[userRole] || userRole}
              </span>
            </div>
          )}
        </div>

        <Separator className="bg-sidebar-border" />

        <ScrollArea className="flex-1 px-3 py-3">
          {showDashboardSection && (
            <div className="mb-4">
              {!collapsed && (
                <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Accueil
                </p>
              )}
              <nav className="flex flex-col gap-1">
                {visibleDashboard.map((item) => (
                  <NavLink key={item.href} item={item} collapsed={collapsed} pathname={pathname} />
                ))}
              </nav>
            </div>
          )}

          {showMessagerieSection && (
            <div className="mb-4">
              {!collapsed && (
                <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Messagerie
                </p>
              )}
              <nav className="flex flex-col gap-1">
                {visibleMessagerie.map((item) => (
                  <NavLink key={item.href} item={item} collapsed={collapsed} pathname={pathname} />
                ))}
              </nav>
            </div>
          )}

          {showIaSection && (
            <>
              <Separator className="mb-4 bg-sidebar-border" />
              <div className="mb-4">
                {!collapsed && (
                  <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Intelligence Artificielle
                  </p>
                )}
                <nav className="flex flex-col gap-1">
                  {visibleIa.map((item) => (
                    <NavLink key={item.href} item={item} collapsed={collapsed} pathname={pathname} />
                  ))}
                </nav>
              </div>
            </>
          )}

          {showAuditSection && (
            <>
              <Separator className="mb-4 bg-sidebar-border" />
              <div className="mb-4">
                {!collapsed && (
                  <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Audit
                  </p>
                )}
                <nav className="flex flex-col gap-1">
                  {visibleAudit.map((item) => (
                    <NavLink key={item.href} item={item} collapsed={collapsed} pathname={pathname} />
                  ))}
                </nav>
              </div>
            </>
          )}

          {showAdminSection && (
            <>
              <Separator className="mb-4 bg-sidebar-border" />
              <div>
                {!collapsed && (
                  <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Administration
                  </p>
                )}
                <nav className="flex flex-col gap-1">
                  {visibleAdmin.map((item) => (
                    <NavLink key={item.href} item={item} collapsed={collapsed} pathname={pathname} />
                  ))}
                </nav>
              </div>
            </>
          )}
        </ScrollArea>

        <Separator className="bg-sidebar-border" />
        <div className="flex flex-col gap-1 p-3">
          <NavLink
            item={{
              label: "Paramètres",
              href: "/settings",
              icon: Settings,
              iconColor: "text-zinc-400",
              iconBg: "bg-zinc-500/15",
            }}
            collapsed={collapsed}
            pathname={pathname}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-full justify-center text-muted-foreground hover:text-foreground"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}

function NavLink({
  item,
  collapsed,
  pathname,
}: {
  item: NavItem;
  collapsed: boolean;
  pathname: string;
}) {
  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
  const Icon = item.icon;

  const link = (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium transition-all duration-200",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
          : "text-sidebar-foreground hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground"
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-200",
          item.iconBg || "bg-secondary",
          isActive && "scale-105 ring-1 ring-white/10"
        )}
      >
        <Icon className={cn("h-4 w-4", item.iconColor || "text-muted-foreground")} />
      </span>
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge && (
            <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-teal-500 px-1.5 text-[10px] font-bold text-white">
              {item.badge}
            </span>
          )}
        </>
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }

  return link;
}
