"use client";

import React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  FolderOpen,
} from "lucide-react";

interface Direction {
  id: number;
  nom: string;
  type: string | null;
  ministereId: number | null;
}

interface Ministere {
  id: number;
  nom: string;
  code: string;
}

const typeLabels: Record<string, string> = {
  courrier: "Direction du Courrier",
  dsi: "DSI",
  daf: "DAF",
  drh: "DRH",
  autre: "Autre",
};

export default function DirectionsPage() {
  const { accessToken } = useAuthStore();
  const [directions, setDirections] = React.useState<Direction[]>([]);
  const [ministeres, setMinisteres] = React.useState<Ministere[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editItem, setEditItem] = React.useState<Direction | null>(null);
  const [formNom, setFormNom] = React.useState("");
  const [formType, setFormType] = React.useState("");
  const [formMinistereId, setFormMinistereId] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const [dirs, mins]: any = await Promise.all([
        api.getDirections(accessToken),
        api.getMinisteres(accessToken),
      ]);
      setDirections(dirs);
      setMinisteres(mins);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    if (!accessToken || !formNom || !formMinistereId) return;
    setSaving(true);
    try {
      const data = {
        nom: formNom,
        type: formType || undefined,
        ministereId: parseInt(formMinistereId),
      };
      if (editItem) {
        await api.updateDirection(accessToken, editItem.id, data);
      } else {
        await api.createDirection(accessToken, data);
      }
      setDialogOpen(false);
      setEditItem(null);
      setFormNom("");
      setFormType("");
      setFormMinistereId("");
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!accessToken || !confirm("Supprimer cette direction ?")) return;
    try {
      await api.deleteDirection(accessToken, id);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getMinistereName = (id: number | null) => {
    if (!id) return "—";
    return ministeres.find((m) => m.id === id)?.nom || "—";
  };

  return (
    <AuthGuard>
      <AppShell>
        <div className="flex flex-col gap-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-[-0.02em]">Directions</h1>
              <p className="text-sm text-muted-foreground">Gestion des directions ministérielles</p>
            </div>
            <Button onClick={() => { setEditItem(null); setFormNom(""); setFormType(""); setFormMinistereId(""); setDialogOpen(true); }}>
              <Plus className="h-4 w-4" />
              Nouvelle direction
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="animate-pulse border-white/10 bg-white/5"><CardContent className="p-6"><div className="h-16 rounded bg-secondary" /></CardContent></Card>
              ))}
            </div>
          ) : directions.length === 0 ? (
            <Card className="border-white/10 bg-white/5">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FolderOpen className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-sm text-muted-foreground">Aucune direction trouvée</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {directions.map((d) => (
                <Card key={d.id} className="group border-white/10 bg-white/5 transition-colors hover:bg-white/5 hover:border-primary/30">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent">
                          <Users className="h-6 w-6 text-accent-foreground" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{d.nom}</h3>
                          <div className="mt-1 flex items-center gap-2">
                            <Badge variant="secondary" className="text-[10px]">
                              {typeLabels[d.type || ""] || d.type || "—"}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {getMinistereName(d.ministereId)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <IconBtn tooltip="Modifier" onClick={() => {
                          setEditItem(d); setFormNom(d.nom); setFormType(d.type || ""); setFormMinistereId(String(d.ministereId || "")); setDialogOpen(true);
                        }}>
                          <Pencil className="h-3 w-3" />
                        </IconBtn>
                        <IconBtn tooltip="Supprimer" className="text-destructive hover:text-destructive" onClick={() => handleDelete(d.id)}>
                          <Trash2 className="h-3 w-3" />
                        </IconBtn>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editItem ? "Modifier la direction" : "Nouvelle direction"}</DialogTitle>
              <DialogDescription>
                {editItem ? "Modifiez les informations de cette direction." : "Ajoutez une nouvelle direction."}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-2">
              <div className="flex flex-col gap-2">
                <Label>Ministère *</Label>
                <Select value={formMinistereId} onValueChange={setFormMinistereId}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un ministère" /></SelectTrigger>
                  <SelectContent>
                    {ministeres.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>{m.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Nom de la direction *</Label>
                <Input placeholder="Ex: Direction du Courrier" value={formNom} onChange={(e) => setFormNom(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Type</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="courrier">Direction du Courrier</SelectItem>
                    <SelectItem value="dsi">DSI</SelectItem>
                    <SelectItem value="daf">DAF</SelectItem>
                    <SelectItem value="drh">DRH</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button onClick={handleSave} disabled={saving || !formNom || !formMinistereId}>
                {saving ? "Enregistrement..." : editItem ? "Modifier" : "Créer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AppShell>
    </AuthGuard>
  );
}
