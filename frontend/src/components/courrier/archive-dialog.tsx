"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Archive } from "lucide-react";

const DUREES = [
  { value: "5", label: "5 ans" },
  { value: "10", label: "10 ans" },
  { value: "15", label: "15 ans" },
  { value: "30", label: "30 ans" },
  { value: "custom", label: "Personnalisée…" },
];

interface ArchiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: { dureeConservation: number; emplacement?: string }) => Promise<void>;
  loading?: boolean;
  courrierRef?: string;
}

export function ArchiveDialog({
  open,
  onOpenChange,
  onConfirm,
  loading,
  courrierRef,
}: ArchiveDialogProps) {
  const [dureePreset, setDureePreset] = useState("10");
  const [customDuree, setCustomDuree] = useState("10");
  const [emplacement, setEmplacement] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    const years =
      dureePreset === "custom" ? parseInt(customDuree, 10) : parseInt(dureePreset, 10);

    if (isNaN(years) || years < 1) {
      setError("Indiquez une durée d'au moins 1 an");
      return;
    }

    try {
      await onConfirm({
        dureeConservation: years,
        emplacement: emplacement.trim() || undefined,
      });
      setEmplacement("");
      setDureePreset("10");
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'archivage");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/15">
              <Archive className="h-4 w-4 text-orange-400" />
            </span>
            Archiver le courrier
          </DialogTitle>
          <DialogDescription>
            {courrierRef
              ? `Conservation longue durée pour ${courrierRef}.`
              : "Définir la durée de conservation et l'emplacement."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="duree">Durée de conservation</Label>
            <Select value={dureePreset} onValueChange={setDureePreset}>
              <SelectTrigger id="duree">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DUREES.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {dureePreset === "custom" && (
              <Input
                type="number"
                min={1}
                max={100}
                value={customDuree}
                onChange={(e) => setCustomDuree(e.target.value)}
                placeholder="Nombre d'années"
              />
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="emplacement">Emplacement (optionnel)</Label>
            <Input
              id="emplacement"
              value={emplacement}
              onChange={(e) => setEmplacement(e.target.value)}
              placeholder="Ex. Armoire A / Rayon 3 / Numérique"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            <Archive className="mr-2 h-4 w-4" />
            {loading ? "Archivage…" : "Confirmer l'archivage"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
