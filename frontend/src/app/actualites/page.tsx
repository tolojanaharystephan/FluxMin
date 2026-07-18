"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { RBACGuard } from "@/components/auth/rbac-guard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/auth-store";
import { api } from "@/lib/api";
import { Newspaper, ChevronRight } from "lucide-react";

type Pub = {
  id: number;
  titre: string;
  typePublication: string;
  priorite: string;
  portee: string;
  statut: string;
  datePublication?: string | null;
  lu?: boolean;
};

export default function ActualitesGeneralesPage() {
  const { accessToken } = useAuthStore();
  const [items, setItems] = useState<Pub[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    api
      .listPublications(accessToken, { portee: "public", statut: "publie" })
      .then((res: any) => setItems(res.data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [accessToken]);

  return (
    <RBACGuard
      allowedRoles={[
        "gouvernement",
        "directeur_ministere",
        "admin_ministere",
        "agent_courrier",
        "responsable",
        "responsable_direction",
        "auditeur",
      ]}
    >
      <AppShell>
        <div className="space-y-6 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Newspaper className="h-6 w-6 text-fuchsia-400" />
              Actualités générales
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Communiqués et informations du Gouvernement destinés à tous les ministères.
            </p>
          </div>

          {loading && <p className="text-sm text-muted-foreground">Chargement…</p>}
          {!loading && items.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Aucune actualité publique pour le moment.
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            {items.map((p) => (
              <Link key={p.id} href={`/actualites/${p.id}`}>
                <Card className="hover:bg-secondary/40 transition-colors cursor-pointer mb-2">
                  <CardContent className="py-4 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Badge variant="outline">{p.typePublication}</Badge>
                        {p.priorite !== "normale" && (
                          <Badge variant={p.priorite === "urgente" ? "destructive" : "warning"}>
                            {p.priorite}
                          </Badge>
                        )}
                        {!p.lu && (
                          <Badge className="bg-teal-500/20 text-teal-300 border-0">Nouveau</Badge>
                        )}
                      </div>
                      <p className="font-medium truncate">{p.titre}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {p.datePublication
                          ? new Date(p.datePublication).toLocaleString("fr-FR")
                          : "—"}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </AppShell>
    </RBACGuard>
  );
}
