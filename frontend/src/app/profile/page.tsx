"use client";

import React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/lib/auth-store";
import {
  User,
  Mail,
  Building2,
  Shield,
  Save,
  Activity,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Administrateur",
  directeur_ministere: "Directeur de ministère",
  agent_courrier: "Agent Courrier",
  responsable: "Responsable",
  responsable_direction: "Responsable Direction",
  auditeur: "Auditeur",
};

function getInitials(nom?: string, prenom?: string): string {
  if (!nom && !prenom) return "??";
  const n = (nom || "").charAt(0).toUpperCase();
  const p = (prenom || "").charAt(0).toUpperCase();
  return `${p}${n}`.trim() || "??";
}

export default function ProfilePage() {
  const { user, updateProfile } = useAuthStore();
  const [nom, setNom] = React.useState(user?.nom || "");
  const [prenom, setPrenom] = React.useState(user?.prenom || "");
  const [saving, setSaving] = React.useState(false);
  const [saveMsg, setSaveMsg] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  React.useEffect(() => {
    setNom(user?.nom || "");
    setPrenom(user?.prenom || "");
  }, [user?.nom, user?.prenom]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      await updateProfile({ nom, prenom });
      setSaveMsg({ type: "success", text: "Profil mis à jour avec succès" });
    } catch (err: any) {
      setSaveMsg({ type: "error", text: err.message || "Erreur lors de la mise à jour" });
    } finally {
      setSaving(false);
    }
  };

  const initials = getInitials(user?.nom, user?.prenom);
  const roleLabel = ROLE_LABELS[user?.role || ""] || user?.role || "";

  return (
    <AuthGuard>
      <AppShell>
        <div className="flex flex-col gap-6 animate-fade-in max-w-3xl">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              <User className="h-6 w-6 text-muted-foreground" />
              Mon profil
            </h1>
            <p className="text-sm text-muted-foreground">
              Consultez et modifiez vos informations personnelles
            </p>
          </div>

          {/* Profile Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-1">
                  <h2 className="text-xl font-bold">
                    {user?.prenom} {user?.nom}
                  </h2>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">
                      <Shield className="mr-1 h-3 w-3" />
                      {roleLabel}
                    </Badge>
                    {user?.ministereNom && (
                      <Badge variant="secondary">
                        <Building2 className="mr-1 h-3 w-3" />
                        {user.ministereNom}
                      </Badge>
                    )}
                    {user?.directionNom && (
                      <Badge variant="secondary">
                        {user.directionNom}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Edit Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" />
                Informations personnelles
              </CardTitle>
              <CardDescription>
                Modifiez vos informations de base
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="prenom">Prénom</Label>
                  <Input
                    id="prenom"
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="nom">Nom</Label>
                  <Input
                    id="nom"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Adresse email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    value={user?.email || ""}
                    className="pl-10"
                    disabled
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  L&apos;email ne peut pas être modifié. Contactez un administrateur.
                </p>
              </div>

              {saveMsg && (
                <div className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${
                  saveMsg.type === "success"
                    ? "border-success/50 bg-success/10 text-success"
                    : "border-destructive/50 bg-destructive/10 text-destructive"
                }`}>
                  {saveMsg.type === "success" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  )}
                  {saveMsg.text}
                </div>
              )}

              <div className="flex justify-end">
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Sauvegarder
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Account Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4" />
                Informations du compte
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Rôle</p>
                      <p className="text-xs text-muted-foreground">{roleLabel}</p>
                    </div>
                  </div>
                  <Badge variant="outline">{user?.role}</Badge>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Direction</p>
                      <p className="text-xs text-muted-foreground">
                        {user?.directionNom || "Non assigné"}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Ministère</p>
                      <p className="text-xs text-muted-foreground">
                        {user?.ministereNom || "Non assigné"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
