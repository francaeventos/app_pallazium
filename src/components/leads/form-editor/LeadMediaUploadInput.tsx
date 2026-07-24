import { useEffect, useState } from "react";
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
import { getStoredAuthToken } from "@/fns/auth";
import {
  formatBytes,
  MEDIA_ACCEPT,
  MEDIA_KIND_LABEL,
  MEDIA_KINDS,
  MEDIA_MAX_BYTES,
  type MediaKind,
  validateMediaFile,
} from "@/lib/leads/media";
import { FileUp, Trash2 } from "lucide-react";
import { toast } from "sonner";

type LeadMediaUploadInputProps = {
  kind: MediaKind;
  url: string;
  onKindChange: (kind: MediaKind) => void;
  onUrlChange: (url: string) => void;
};

export function LeadMediaUploadInput({
  kind,
  url,
  onKindChange,
  onUrlChange,
}: LeadMediaUploadInputProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress(0);
  }, [kind]);

  const upload = async (file?: File) => {
    if (!file) return;
    const error = validateMediaFile(file, kind);
    if (error) {
      toast.error(error);
      return;
    }

    const token = getStoredAuthToken();
    if (!token) {
      toast.error("Faça login novamente para enviar arquivos.");
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", kind);

      const publicUrl = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/leads/media-upload");
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) return;
          setProgress(Math.round((event.loaded / event.total) * 100));
        };
        xhr.onload = () => {
          try {
            const payload = JSON.parse(xhr.responseText || "{}") as {
              publicUrl?: string;
              error?: string;
            };
            if (xhr.status >= 200 && xhr.status < 300 && payload.publicUrl) {
              resolve(payload.publicUrl);
              return;
            }
            reject(new Error(payload.error || `Falha no upload (${xhr.status}).`));
          } catch {
            reject(new Error(`Falha no upload (${xhr.status}).`));
          }
        };
        xhr.onerror = () => reject(new Error("Falha de rede no upload."));
        xhr.send(formData);
      });

      onUrlChange(publicUrl);
      toast.success(`${MEDIA_KIND_LABEL[kind]} enviado (${formatBytes(file.size)})`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar arquivo.");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Tipo de mídia</Label>
          <Select value={kind} onValueChange={(v) => onKindChange(v as MediaKind)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEDIA_KINDS.map((k) => (
                <SelectItem key={k} value={k}>
                  {MEDIA_KIND_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Arquivo (até {formatBytes(MEDIA_MAX_BYTES)})</Label>
          <Button type="button" variant="outline" className="w-full" disabled={uploading} asChild>
            <label className="cursor-pointer">
              <FileUp className="mr-1 h-4 w-4" />
              {uploading ? `Enviando… ${progress}%` : "Enviar arquivo"}
              <input
                type="file"
                accept={MEDIA_ACCEPT[kind]}
                className="sr-only"
                disabled={uploading}
                onChange={(e) => {
                  void upload(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>URL da mídia</Label>
        <div className="flex gap-2">
          <Input
            value={url}
            placeholder="https://… ou envie um arquivo"
            onChange={(e) => onUrlChange(e.target.value)}
          />
          {url ? (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              title="Limpar"
              onClick={() => onUrlChange("")}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          Aceita {MEDIA_KIND_LABEL[kind].toLowerCase()} de até 100 MB. Você também pode colar uma
          URL externa.
        </p>
      </div>

      {url ? <LeadMediaPreview kind={kind} url={url} /> : null}
    </div>
  );
}

export function LeadMediaPreview({ kind, url }: { kind: MediaKind; url: string }) {
  if (!url) return null;
  if (kind === "image") {
    return (
      <img
        src={url}
        alt="Prévia"
        className="max-h-48 w-full rounded-xl border object-contain bg-muted"
      />
    );
  }
  if (kind === "video") {
    return (
      <video src={url} controls className="max-h-56 w-full rounded-xl border bg-black" />
    );
  }
  if (kind === "audio") {
    return <audio src={url} controls className="w-full" />;
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-xl border bg-muted/40 px-3 py-2 text-sm font-medium underline-offset-2 hover:underline"
    >
      Abrir PDF
    </a>
  );
}
