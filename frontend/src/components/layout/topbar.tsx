"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/components/providers/theme-provider";
import { useAuthStore } from "@/lib/auth-store";
import { useNotifications } from "@/lib/use-notifications";
import { api } from "@/lib/api";
import {
  Search,
  Bell,
  Sun,
  Moon,
  LogOut,
  User,
  Settings,
  ChevronDown,
  Mail,
  Loader2,
} from "lucide-react";

function getInitials(nom?: string, prenom?: string): string {
  if (!nom && !prenom) return "??";
  const n = (nom || "").charAt(0).toUpperCase();
  const p = (prenom || "").charAt(0).toUpperCase();
  return `${p}${n}`.trim() || "??";
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Administrateur",
  admin_ministere: "Admin Ministère",
  agent_courrier: "Agent Courrier",
  responsable: "Responsable",
  responsable_direction: "Responsable Direction",
  auditeur: "Auditeur",
};

interface SearchHit {
  id: number;
  reference: string;
  objet: string;
  statut: string;
  emetteurNom?: string | null;
}

export function TopBar() {
  const { theme, toggleTheme } = useTheme();
  const { user, accessToken, logout } = useAuthStore();
  const { unreadCount } = useNotifications();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!accessToken) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res: any = await api.getCourriers(accessToken, {
          search: q,
          scope: "accessible",
          limit: 8,
          page: 1,
        });
        setResults(res.data || []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, accessToken]);

  const handleLogout = () => {
    logout();
    router.replace("/");
  };

  const goToResult = (id: number) => {
    setOpen(false);
    setQuery("");
    router.push(`/courriers/${id}`);
  };

  const goToInboxSearch = () => {
    const q = query.trim();
    setOpen(false);
    if (user?.role === "auditeur") {
      router.push(q ? `/audit/search?q=${encodeURIComponent(q)}` : "/audit/search");
      return;
    }
    router.push(q ? `/inbox?q=${encodeURIComponent(q)}` : "/inbox");
  };

  const initials = getInitials(user?.nom, user?.prenom);
  const displayName = user ? `${user.prenom || ""} ${user.nom || ""}`.trim() || user.email : "Utilisateur";
  const roleLabel = ROLE_LABELS[user?.role || ""] || user?.role || "";
  const directionLabel = user?.directionNom || user?.ministereNom || "";

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card/50 px-6 backdrop-blur-sm">
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <div className="relative w-full" ref={wrapRef}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.trim().length >= 2 && setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (results.length === 1) goToResult(results[0].id);
                else goToInboxSearch();
              }
            }}
            placeholder="Rechercher un courrier, une référence..."
            className="pl-10 pr-14 bg-secondary/50 border-transparent focus:border-border focus:bg-background"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            ⌘K
          </kbd>

          {open && query.trim().length >= 2 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
              {searching && (
                <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Recherche...
                </div>
              )}
              {!searching && results.length === 0 && (
                <div className="px-4 py-3 text-sm text-muted-foreground">
                  Aucun résultat pour « {query.trim()} »
                </div>
              )}
              {!searching &&
                results.map((hit) => (
                  <button
                    key={hit.id}
                    type="button"
                    onClick={() => goToResult(hit.id)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-secondary/60 transition-colors"
                  >
                    <Mail className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{hit.objet}</p>
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        {hit.reference}
                        {hit.emetteurNom ? ` · ${hit.emetteurNom}` : ""}
                      </p>
                    </div>
                  </button>
                ))}
              {!searching && results.length > 0 && (
                <button
                  type="button"
                  onClick={goToInboxSearch}
                  className="w-full border-t border-border px-4 py-2.5 text-left text-xs font-medium text-primary hover:bg-secondary/40"
                >
                  Voir tous les résultats dans la boîte de réception
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground hover:text-foreground">
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground"
          onClick={() => router.push("/notifications")}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 pl-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="hidden flex-col items-start text-left md:flex">
                <span className="text-sm font-medium">{displayName}</span>
                <span className="text-[10px] text-muted-foreground">
                  {directionLabel ? `${roleLabel} · ${directionLabel}` : roleLabel}
                </span>
              </div>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-1">
                <span>{displayName}</span>
                <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/profile")}>
              <User className="mr-2 h-4 w-4" />
              Profil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              Paramètres
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
