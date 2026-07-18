"use client";

import React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/lib/auth-store";
import { api } from "@/lib/api";
import { IconBtn } from "@/components/ui/icon-btn";
import { UserPlus, Search, Pencil, Trash2, FolderOpen } from "lucide-react";

interface Utilisateur {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  role: string | null;
  directionId: number | null;
  ministereId: number | null;
  created_at: string;
}

interface Direction {
  id: number;
  nom: string;
  ministereId: number | null;
}

interface Ministere {
  id: number;
  nom: string;
  code: string;
}

const emptyForm = {
  email: "",
  motDePasse: "",
  nom: "",
  prenom: "",
  role: "responsable",
  directionId: "",
  ministereId: "",
};

const roleLabels: Record<string, string> = {
  responsable: "Responsable",
  agent_courrier: "Agent Courrier",
  auditeur: "Auditeur",
  super_admin: "Super Admin",
  directeur_ministere: "Directeur de ministère",
  gouvernement: "Gouvernement",
  responsable_direction: "Responsable Direction",
};

const roleColors: Record<string, "default" | "secondary" | "success" | "warning" | "info" | "destructive" | "outline"> = {
  agent_courrier: "secondary",
  responsable: "info",
  directeur_ministere: "default",
  auditeur: "warning",
  super_admin: "destructive",
  gouvernement: "success",
  responsable_direction: "info",
};

export default function UtilisateursPage() {
  const { accessToken } = useAuthStore();
  const [utilisateurs, setUtilisateurs] = React.useState<Utilisateur[]>([]);
  const [directions, setDirections] = React.useState<Direction[]>([]);
  const [ministeres, setMinisteres] = React.useState<Ministere[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editItem, setEditItem] = React.useState<Utilisateur | null>(null);
  const [form, setForm] = React.useState(emptyForm);
  const [saving, setSaving] = React.useState(false);

  const isDirecteur = form.role === "directeur_ministere";

  const fetchData = React.useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const [users, dirs, mins]: any = await Promise.all([
        api.getUtilisateurs(accessToken, search || undefined),
        api.getDirections(accessToken),
        api.getMinisteres(accessToken),
      ]);
      setUtilisateurs(users);
      setDirections(dirs);
      setMinisteres(mins);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [accessToken, search]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    if (!accessToken || !form.email || !form.nom || !form.prenom) return;
    if (isDirecteur && !form.ministereId) {
      alert("Un directeur de ministère doit être rattaché à un ministère");
      return;
    }
    setSaving(true);
    try {
      const data: any = {
        email: form.email,
        nom: form.nom,
        prenom: form.prenom,
        role: form.role,
      };
      if (isDirecteur) {
        data.ministereId = parseInt(form.ministereId);
        data.directionId = null;
      } else {
        data.directionId = form.directionId ? parseInt(form.directionId) : null;
        data.ministereId = null;
      }
      if (!editItem) {
        data.motDePasse = form.motDePasse || "fluxmin2026";
      } else if (form.motDePasse) {
        data.motDePasse = form.motDePasse;
      }

      if (editItem) {
        await api.updateUtilisateur(accessToken, editItem.id, data);
      } else {
        await api.createUtilisateur(accessToken, data);
      }
      setDialogOpen(false);
      setEditItem(null);
      setForm(emptyForm);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!accessToken || !confirm("Supprimer cet utilisateur ?")) return;
    try {
      await api.deleteUtilisateur(accessToken, id);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getAffiliationLabel = (u: Utilisateur) => {
    if (u.role === "directeur_ministere" && u.ministereId) {
      return ministeres.find((m) => m.id === u.ministereId)?.nom || "—";
    }
    if (!u.directionId) return "—";
    return directions.find((d) => d.id === u.directionId)?.nom || "—";
  };

  return (
    <AuthGuard>
      <AppShell>
        <div className="flex flex-col gap-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Utilisateurs</h1>
              <p className="text-sm text-muted-foreground">Gestion des comptes utilisateurs</p>
            </div>
            <Button onClick={() => {
              setEditItem(null);
              setForm(emptyForm);
              setDialogOpen(true);
            }}>
              <UserPlus className="h-4 w-4" />
              Nouvel utilisateur
            </Button>
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Rechercher par nom, prénom ou email..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="animate-pulse"><CardContent className="p-4"><div className="h-12 rounded bg-secondary" /></CardContent></Card>
              ))}
            </div>
          ) : utilisateurs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FolderOpen className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-sm text-muted-foreground">Aucun utilisateur trouvé</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {utilisateurs.map((u) => (
                <Card key={u.id} className="group transition-colors hover:bg-secondary/30">
                  <CardContent className="flex items-center gap-4 p-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {u.prenom?.[0]}{u.nom?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{u.prenom} {u.nom}</p>
                        <Badge variant={roleColors[u.role || "agent"]} className="text-[10px]">
                          {roleLabels[u.role || "agent"] || u.role}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {u.email} · {getAffiliationLabel(u)}
                      </p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <IconBtn tooltip="Modifier" onClick={() => {
                        setEditItem(u);
                        setForm({
                          email: u.email,
                          motDePasse: "",
                          nom: u.nom || "",
                          prenom: u.prenom || "",
                          role: u.role || "responsable",
                          directionId: String(u.directionId || ""),
                          ministereId: String(u.ministereId || ""),
                        });
                        setDialogOpen(true);
                      }}>
                        <Pencil className="h-3 w-3" />
                      </IconBtn>
                      <IconBtn tooltip="Supprimer" className="text-destructive hover:text-destructive" onClick={() => handleDelete(u.id)}>
                        <Trash2 className="h-3 w-3" />
                      </IconBtn>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editItem ? "Modifier l'utilisateur" : "Nouvel utilisateur"}</DialogTitle>
              <DialogDescription>
                {editItem ? "Modifiez les informations de cet utilisateur." : "Créez un nouveau compte utilisateur."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-2">
              <div className="flex flex-col gap-2">
                <Label>Nom *</Label>
                <Input placeholder="Dupont" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Prénom *</Label>
                <Input placeholder="Jean" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} />
              </div>
              <div className="col-span-2 flex flex-col gap-2">
                <Label>Email *</Label>
                <Input type="email" placeholder="agent@fluxmin.gouv.fr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="col-span-2 flex flex-col gap-2">
                <Label>Mot de passe {!editItem && "*"}</Label>
                <Input type="password" placeholder={editItem ? "Laisser vide pour conserver" : "••••••••"} value={form.motDePasse} onChange={(e) => setForm({ ...form, motDePasse: e.target.value })} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Rôle</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) =>
                    setForm({
                      ...form,
                      role: v,
                      directionId: v === "directeur_ministere" ? "" : form.directionId,
                      ministereId: v === "directeur_ministere" ? form.ministereId : "",
                    })
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="responsable">Responsable</SelectItem>
                    <SelectItem value="agent_courrier">Agent Courrier</SelectItem>
                    <SelectItem value="auditeur">Auditeur</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="directeur_ministere">Directeur de ministère</SelectItem>
                    <SelectItem value="gouvernement">Gouvernement</SelectItem>
                    <SelectItem value="responsable_direction">Responsable Direction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {isDirecteur ? (
                <div className="flex flex-col gap-2">
                  <Label>Ministère *</Label>
                  <Select value={form.ministereId} onValueChange={(v) => setForm({ ...form, ministereId: v, directionId: "" })}>
                    <SelectTrigger><SelectValue placeholder="Choisir un ministère" /></SelectTrigger>
                    <SelectContent>
                      {ministeres.map((m) => (
                        <SelectItem key={m.id} value={String(m.id)}>{m.nom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Label>Direction</Label>
                  <Select value={form.directionId} onValueChange={(v) => setForm({ ...form, directionId: v })}>
                    <SelectTrigger><SelectValue placeholder="Aucune" /></SelectTrigger>
                    <SelectContent>
                      {directions.map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>{d.nom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button
                onClick={handleSave}
                disabled={
                  saving ||
                  !form.email ||
                  !form.nom ||
                  !form.prenom ||
                  (!editItem && !form.motDePasse) ||
                  (isDirecteur && !form.ministereId)
                }
              >
                {saving ? "Enregistrement..." : editItem ? "Modifier" : "Créer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AppShell>
    </AuthGuard>
  );
}
