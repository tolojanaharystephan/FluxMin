"use client";

import React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/components/providers/theme-provider";
import { useAuthStore } from "@/lib/auth-store";
import {
  Settings,
  User,
  Bell,
  Shield,
  Palette,
  Save,
  Moon,
  Sun,
  Key,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const { user, updateProfile } = useAuthStore();
  const [nom, setNom] = React.useState(user?.nom || "");
  const [prenom, setPrenom] = React.useState(user?.prenom || "");
  const [savingProfile, setSavingProfile] = React.useState(false);
  const [profileMsg, setProfileMsg] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showCurrentPw, setShowCurrentPw] = React.useState(false);
  const [showNewPw, setShowNewPw] = React.useState(false);
  const [showConfirmPw, setShowConfirmPw] = React.useState(false);
  const [savingPassword, setSavingPassword] = React.useState(false);
  const [passwordMsg, setPasswordMsg] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  const { changePassword } = useAuthStore();

  React.useEffect(() => {
    setNom(user?.nom || "");
    setPrenom(user?.prenom || "");
  }, [user?.nom, user?.prenom]);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      await updateProfile({ nom, prenom });
      setProfileMsg({ type: "success", text: "Profil mis à jour" });
    } catch (err: any) {
      setProfileMsg({ type: "error", text: err.message || "Erreur" });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordMsg(null);

    if (!currentPassword || !newPassword) {
      setPasswordMsg({ type: "error", text: "Veuillez remplir tous les champs" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "Les nouveaux mots de passe ne correspondent pas" });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ type: "error", text: "Le mot de passe doit contenir au moins 6 caractères" });
      return;
    }

    setSavingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordMsg({ type: "success", text: "Mot de passe modifié avec succès" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordMsg({ type: "error", text: err.message || "Erreur lors du changement de mot de passe" });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <AuthGuard>
      <AppShell>
        <div className="flex flex-col gap-6 animate-fade-in max-w-3xl">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.02em] flex items-center gap-3">
              <Settings className="h-6 w-6 text-muted-foreground" />
              Paramètres
            </h1>
            <p className="text-sm text-muted-foreground">
              Configurez votre espace de travail
            </p>
          </div>

          {/* Profile */}
          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" />
                Profil
              </CardTitle>
              <CardDescription>
                Informations personnelles et préférences de compte
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="nom">Nom</Label>
                  <Input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="prenom">Prénom</Label>
                  <Input id="prenom" value={prenom} onChange={(e) => setPrenom(e.target.value)} />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue={user?.email || ""} disabled />
              </div>
              {profileMsg && (
                <div className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${
                  profileMsg.type === "success"
                    ? "border-success/50 bg-success/10 text-success"
                    : "border-destructive/50 bg-destructive/10 text-destructive"
                }`}>
                  {profileMsg.type === "success" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  )}
                  {profileMsg.text}
                </div>
              )}
              <div className="flex justify-end">
                <Button size="sm" onClick={handleSaveProfile} disabled={savingProfile}>
                  {savingProfile ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Sauvegarder
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette className="h-4 w-4" />
                Apparence
              </CardTitle>
              <CardDescription>
                Personnalisez l&apos;apparence de l&apos;interface
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {theme === "dark" ? (
                    <Moon className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <Sun className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-sm font-medium">Thème</p>
                    <p className="text-xs text-muted-foreground">
                      {theme === "dark" ? "Mode sombre" : "Mode clair"}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={toggleTheme}>
                  Basculer en {theme === "dark" ? "clair" : "sombre"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="h-4 w-4" />
                Notifications
              </CardTitle>
              <CardDescription>
                Gérez vos préférences de notification
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {[
                { label: "Nouveaux courriers reçus", description: "Recevoir une notification pour chaque nouveau courrier", enabled: true },
                { label: "Rappels de traitement", description: "Notifications pour les courriers en attente depuis plus de 48h", enabled: true },
                { label: "Mises à jour de statut", description: "Notifications quand le statut d'un courrier change", enabled: false },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <button
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      item.enabled ? "bg-primary" : "bg-secondary"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        item.enabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Security */}
          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4" />
                Sécurité
              </CardTitle>
              <CardDescription>
                Paramètres de sécurité du compte
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-4">
                <p className="text-sm font-medium">Changer le mot de passe</p>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="currentPassword">Mot de passe actuel</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="currentPassword"
                      type={showCurrentPw ? "text" : "password"}
                      className="pl-10 pr-10"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPw(!showCurrentPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPw ? "text" : "password"}
                        className="pr-10"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPw(!showNewPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="confirmPassword">Confirmer</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPw ? "text" : "password"}
                        className="pr-10"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPw(!showConfirmPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Le mot de passe doit contenir au moins 6 caractères.
                </p>
                {passwordMsg && (
                  <div className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${
                    passwordMsg.type === "success"
                      ? "border-success/50 bg-success/10 text-success"
                      : "border-destructive/50 bg-destructive/10 text-destructive"
                  }`}>
                    {passwordMsg.type === "success" ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0" />
                    )}
                    {passwordMsg.text}
                  </div>
                )}
                <div className="flex justify-end">
                  <Button size="sm" onClick={handleChangePassword} disabled={savingPassword}>
                    {savingPassword ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    ) : (
                      <Key className="h-4 w-4" />
                    )}
                    Changer le mot de passe
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
