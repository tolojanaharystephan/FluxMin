"use client";

import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Paperclip,
  FileText,
  Image,
  File,
  X,
  Download,
  Upload,
  Loader2,
  Trash2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_BYTES = 50 * 1024 * 1024;
const ACCEPT =
  ".pdf,.png,.jpg,.jpeg,.gif,.webp,.txt,.csv,.rtf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp";
const ALLOWED_EXT = [
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".txt",
  ".csv",
  ".rtf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".odt",
  ".ods",
  ".odp",
];

export function formatFileSize(bytes: number | null | undefined) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / 1048576).toFixed(1)} Mo`;
}

export function getFileIcon(typeMime?: string | null) {
  if (!typeMime) return File;
  if (typeMime.startsWith("image/")) return Image;
  if (typeMime === "application/pdf") return FileText;
  return File;
}

export function validateUploadFiles(incoming: File[]): { accepted: File[]; errors: string[] } {
  const accepted: File[] = [];
  const errors: string[] = [];
  for (const file of incoming) {
    const ext = `.${file.name.split(".").pop()?.toLowerCase() || ""}`;
    if (!ALLOWED_EXT.includes(ext)) {
      errors.push(`${file.name} : format non supporté`);
      continue;
    }
    if (file.size > MAX_BYTES) {
      errors.push(`${file.name} : dépasse 50 Mo`);
      continue;
    }
    accepted.push(file);
  }
  return { accepted, errors };
}

interface PendingFilesZoneProps {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
  className?: string;
}

/** Zone d'ajout de fichiers (création) — style SaaS drag & drop */
export function PendingFilesZone({ files, onChange, disabled, className }: PendingFilesZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addFiles = (list: FileList | File[]) => {
    const { accepted, errors } = validateUploadFiles(Array.from(list));
    setError(errors.length ? errors.join("\n") : null);
    if (accepted.length) onChange([...files, ...accepted]);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        accept={ACCEPT}
        disabled={disabled}
        onChange={(e) => {
          if (e.target.files?.length) addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "w-full rounded-2xl border border-dashed px-6 py-8 text-center transition-all duration-200",
          "bg-gradient-to-b from-secondary/40 to-transparent",
          dragOver
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border/80 hover:border-primary/40 hover:bg-secondary/30",
          disabled && "opacity-50 pointer-events-none"
        )}
      >
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-background shadow-sm border border-border/60">
          <Upload className="h-5 w-5 text-primary" />
        </div>
        <p className="text-sm font-medium">Glissez vos fichiers ici</p>
        <p className="mt-1 text-xs text-muted-foreground">
          ou cliquez pour parcourir — PDF, Office, texte, images · max 50 Mo
        </p>
      </button>

      {error && (
        <p className="text-xs text-destructive whitespace-pre-line bg-destructive/10 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file, idx) => {
            const Icon = getFileIcon(file.type);
            return (
              <li
                key={`${file.name}-${idx}`}
                className="flex items-center gap-3 rounded-xl border border-border/70 bg-card px-3 py-2.5 shadow-sm"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-[11px] text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => onChange(files.filter((_, i) => i !== idx))}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export interface StoredAttachment {
  id: number;
  nomFichier: string;
  typeMime?: string | null;
  tailleBytes?: number | null;
}

interface AttachmentsPanelProps {
  attachments: StoredAttachment[];
  canUpload?: boolean;
  canDelete?: boolean;
  uploading?: boolean;
  onUpload?: (files: File[]) => Promise<void> | void;
  onDownload?: (id: number) => void;
  onDelete?: (id: number) => void;
  onAnalyze?: (id: number) => void;
  onAnalyzeAll?: () => void;
  analyzingId?: number | null;
  analyzingAll?: boolean;
  className?: string;
}

/** Panneau PJ sur détail courrier — style SaaS */
export function AttachmentsPanel({
  attachments,
  canUpload,
  canDelete,
  uploading,
  onUpload,
  onDownload,
  onDelete,
  onAnalyze,
  onAnalyzeAll,
  analyzingId,
  analyzingAll,
  className,
}: AttachmentsPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleIncoming = async (list: FileList | File[]) => {
    const { accepted, errors } = validateUploadFiles(Array.from(list));
    setError(errors.length ? errors.join("\n") : null);
    if (accepted.length && onUpload) await onUpload(accepted);
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/70 bg-card/80 backdrop-blur-sm shadow-sm overflow-hidden",
        className
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Pièces jointes</p>
          <p className="text-[11px] text-muted-foreground">
            {attachments.length} fichier{attachments.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {onAnalyzeAll && attachments.length > 0 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={analyzingAll || analyzingId != null}
              onClick={onAnalyzeAll}
              className="rounded-xl text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10"
              title="Analyser toutes les PJ et leurs correspondances"
            >
              {analyzingAll ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              )}
              Analyser tout
            </Button>
          )}
          {canUpload && (
            <>
              <input
                ref={inputRef}
                type="file"
                multiple
                className="hidden"
                accept={ACCEPT}
                onChange={async (e) => {
                  if (e.target.files?.length) await handleIncoming(e.target.files);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
                className="rounded-xl"
              >
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <Paperclip className="h-3.5 w-3.5 mr-1.5" />
                )}
                Ajouter
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="p-3 space-y-2">
        {canUpload && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={async (e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files?.length) await handleIncoming(e.dataTransfer.files);
            }}
            className={cn(
              "rounded-xl border border-dashed px-3 py-4 text-center text-xs text-muted-foreground transition-colors",
              dragOver ? "border-primary bg-primary/5" : "border-border/70"
            )}
          >
            Déposez des fichiers pour les joindre
          </div>
        )}

        {error && (
          <p className="text-xs text-destructive whitespace-pre-line bg-destructive/10 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {attachments.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">
            Aucune pièce jointe pour le moment.
          </p>
        )}

        {attachments.map((pj) => {
          const Icon = getFileIcon(pj.typeMime);
          return (
            <div
              key={pj.id}
              className="group flex items-center gap-3 rounded-xl border border-transparent bg-secondary/40 hover:bg-secondary/70 hover:border-border/50 px-3 py-2.5 transition-colors"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background border border-border/50">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{pj.nomFichier}</p>
                <p className="text-[11px] text-muted-foreground">{formatFileSize(pj.tailleBytes)}</p>
              </div>
              <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                {onAnalyze && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-cyan-400"
                    disabled={analyzingId === pj.id}
                    onClick={() => onAnalyze(pj.id)}
                    title="Analyser avec l'IA"
                  >
                    {analyzingId === pj.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                  </Button>
                )}
                {onDownload && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onDownload(pj.id)}
                    title="Télécharger"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                )}
                {canDelete && onDelete && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => onDelete(pj.id)}
                    title="Supprimer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
