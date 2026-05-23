import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Upload } from "lucide-react";
import { toast } from "sonner";

type StorageImageInputProps = {
  bucket: string;
  name: string;
  label: string;
  defaultValue?: string | null;
  folder?: string;
  publicBucket?: boolean;
  onValueChange?: (url: string) => void;
};

export function StorageImageInput({
  bucket,
  name,
  label,
  defaultValue,
  folder = "uploads",
  publicBucket = true,
  onValueChange,
}: StorageImageInputProps) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setUrl(defaultValue ?? "");
  }, [defaultValue]);

  const upload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    const path = buildStoragePath(folder, file.name);
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "31536000",
      upsert: false,
    });
    if (error) {
      setUploading(false);
      return toast.error(error.message);
    }

    const uploadedUrl = await getStorageUrl(bucket, path, publicBucket);
    setUploading(false);
    if (!uploadedUrl) return;

    setUrl(uploadedUrl);
    onValueChange?.(uploadedUrl);
    toast.success("Imagem enviada");
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <Input
          name={name}
          type="url"
          value={url}
          onChange={(event) => {
            setUrl(event.target.value);
            onValueChange?.(event.target.value);
          }}
          placeholder="URL da imagem ou envie um arquivo"
        />
        <Button type="button" variant="outline" disabled={uploading} asChild>
          <label className="cursor-pointer">
            <Upload className="mr-1 h-4 w-4" />
            {uploading ? "Enviando..." : "Enviar"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(event) => upload(event.target.files?.[0])}
            />
          </label>
        </Button>
      </div>
      {url && (
        <div
          className="h-28 rounded-xl border bg-muted bg-cover bg-center"
          style={{ backgroundImage: `url(${url})` }}
        />
      )}
      <p className="text-xs text-muted-foreground">
        Bucket: <span className="font-medium">{bucket}</span>
        {publicBucket ? ". Imagem pública." : ". Imagem privada com link assinado."}
      </p>
    </div>
  );
}

export function StorageImagesTextarea({
  bucket,
  name,
  label,
  defaultValue,
  folder = "uploads",
  publicBucket = true,
}: StorageImageInputProps) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setValue(defaultValue ?? "");
  }, [defaultValue]);

  const upload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    const path = buildStoragePath(folder, file.name);
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "31536000",
      upsert: false,
    });
    if (error) {
      setUploading(false);
      return toast.error(error.message);
    }

    const uploadedUrl = await getStorageUrl(bucket, path, publicBucket);
    setUploading(false);
    if (!uploadedUrl) return;

    setValue((current) => [current.trim(), uploadedUrl].filter(Boolean).join("\n"));
    toast.success("Imagem adicionada");
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Textarea
        name={name}
        rows={5}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Uma URL por linha"
      />
      <Button type="button" variant="outline" disabled={uploading} asChild>
        <label className="cursor-pointer">
          <Upload className="mr-1 h-4 w-4" />
          {uploading ? "Enviando..." : "Adicionar imagem"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(event) => upload(event.target.files?.[0])}
          />
        </label>
      </Button>
      <p className="text-xs text-muted-foreground">
        Bucket: <span className="font-medium">{bucket}</span>. Cada upload adiciona uma nova URL.
      </p>
    </div>
  );
}

async function getStorageUrl(bucket: string, path: string, publicBucket: boolean) {
  if (publicBucket) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  const tenYearsInSeconds = 60 * 60 * 24 * 365 * 10;
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, tenYearsInSeconds);
  if (error) {
    toast.error(error.message);
    return null;
  }
  return data.signedUrl;
}

function buildStoragePath(folder: string, fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase() || "jpg";
  const safeName = fileName
    .replace(/\.[^/.]+$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 48);
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${folder}/${id}-${safeName || "imagem"}.${extension}`;
}
