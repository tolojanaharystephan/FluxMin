"use client";

import React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/lib/auth-store";
import { api } from "@/lib/api";
import { IconBtn } from "@/components/ui/icon-btn";
import {
  Building2,
  Plus,
  Search,
  Pencil,
  Trash2,
  FolderOpen,
} from "lucide-react";

interface Ministere {
  id: number;
  nom: string;
  code: string;
  created_at: string;
}

export default function MinisteresPage() {
  const { accessToken } = useAuthStore();
  const [ministeres, setMinisteres] = React.useState<Ministere[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editItem, setEditItem] = React.useState<Ministere | null>(null);
  const [formNom, setFormNom] = React.useState("");
  const [formCode, setFormCode] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const fetchMinisteres = React.useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const data: any = await api.getMinisteres(accessToken, search || undefined);
      setMinisteres(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [accessToken, search]);

  React.useEffect(() => {
    fetchMinisteres();
  }, [fetchMinisteres]);

  const handleSave = async () => {
    if (!accessToken || !formNom) return;
    setSaving(true);
    try {
      if (editItem) {
        await api.updateMinistere(accessToken, editItem.id, { nom: formNom, code: formCode || undefined });
      } else {
        await api.createMinistere(accessToken, { nom: formNom, code: formCode || undefined });
      }
      setDialogOpen(false);
      setEditItem(null);
      setFormNom("");
      setFormCode("");
      fetchMinisteres();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!accessToken || !confirm("Supprimer ce ministère ?")) return;
    try {
      await api.deleteMinistere(accessToken, id);
      fetchMinisteres();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openCreate = () => {
    setEditItem(null);
    setFormNom("");
    setFormCode("");
    setDialogOpen(true);
  };

  const openEdit = (item: Ministere) => {
    setEditItem(item);
    setFormNom(item.nom);
    setFormCode(item.code || "");
    setDialogOpen(true);
  };

  return (
    <AuthGuard>
      <AppShell>
        <div className="flex flex-col gap-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-[-0.02em]">Ministères</h1>
              <p className="text-sm text-muted-foreground">Gestion des entités ministérielles</p>
            </div>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nouveau ministère
            </Button>
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Rechercher un ministère..." className="pl-10 rounded-xl" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="animate-pulse border-white/10 bg-white/5">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-secondary" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-3/4 rounded bg-secondary" />
                        <div className="h-3 w-1/2 rounded bg-secondary" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : ministeres.length === 0 ? (
              <Card className="col-span-full border-white/10 bg-white/5">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <FolderOpen className="h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-sm text-muted-foreground">Aucun ministère trouvé</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={openCreate}>
                    <Plus className="h-4 w-4" />
                    Créer le premier ministère
                  </Button>
                </CardContent>
              </Card>
            ) : (
              ministeres.map((m) => (
                <Card key={m.id} className="group border-white/10 bg-white/5 transition-colors hover:bg-white/5 hover:border-primary/30">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                          <Building2 className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{m.nom}</h3>
                          <p className="text-xs text-muted-foreground font-mono">{m.code || '—'}</p>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <IconBtn tooltip="Modifier" onClick={() => openEdit(m)}>
                          <Pencil className="h-3 w-3" />
                        </IconBtn>
                        <IconBtn tooltip="Supprimer" className="text-destructive hover:text-destructive" onClick={() => handleDelete(m.id)}>
                          <Trash2 className="h-3 w-3" />
                        </IconBtn>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Dialog CRUD */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editItem ? "Modifier le ministère" : "Nouveau ministère"}</DialogTitle>
              <DialogDescription>
                {editItem ? "Modifiez les informations de ce ministère." : "Ajoutez un nouveau ministère à la plateforme."}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-2">
              <div className="flex flex-col gap-2">
                <Label>Nom du ministère</Label>
                <Input placeholder="Ex: Ministère des Forces Armées" value={formNom} onChange={(e) => setFormNom(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Code (optionnel)</Label>
                <Input placeholder="Ex: MFA" value={formCode} onChange={(e) => setFormCode(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button onClick={handleSave} disabled={saving || !formNom}>
                {saving ? "Enregistrement..." : editItem ? "Modifier" : "Créer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AppShell>
    </AuthGuard>
  );
}
