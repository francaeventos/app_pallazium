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
    const validationError = validateImageFile(file);
    if (validationError) return toast.error(validationError);

    setUploading(true);
    const path = buildStoragePath(folder, file.name);
    const { error } = await uploadImage(bucket, path, file);
    if (error) {
      console.error("Storage upload error", { bucket, path, error });
      const fallbackUrl = await imageToDataUrl(file);
      setUploading(false);
      setUrl(fallbackUrl);
      onValueChange?.(fallbackUrl);
      toast.warning("Storage indisponível. A imagem foi salva no cadastro.");
      return;
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
          type="text"
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
    const validationError = validateImageFile(file);
    if (validationError) return toast.error(validationError);

    setUploading(true);
    const path = buildStoragePath(folder, file.name);
    const { error } = await uploadImage(bucket, path, file);
    if (error) {
      console.error("Storage upload error", { bucket, path, error });
      const fallbackUrl = await imageToDataUrl(file);
      setUploading(false);
      setValue((current) => [current.trim(), fallbackUrl].filter(Boolean).join("\n"));
      toast.warning("Storage indisponível. A imagem foi adicionada no cadastro.");
      return;
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

async function uploadImage(bucket: string, path: string, file: File) {
  const signed = await supabase.storage.from(bucket).createSignedUploadUrl(path);
  if (!signed.error && signed.data?.token) {
    const uploaded = await supabase.storage
      .from(bucket)
      .uploadToSignedUrl(path, signed.data.token, file, {
        cacheControl: "31536000",
        contentType: file.type,
        upsert: false,
      });
    if (!uploaded.error) return { error: null };
    console.error("Signed storage upload error", { bucket, path, error: uploaded.error });
  }

  const direct = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });
  return { error: direct.error ?? signed.error ?? null };
}

function validateImageFile(file: File) {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return "Envie uma imagem JPG, PNG, WEBP ou GIF.";
  }

  const maxSizeInBytes = 10 * 1024 * 1024;
  if (file.size > maxSizeInBytes) {
    return "A imagem precisa ter no máximo 10 MB.";
  }

  return null;
}

function imageToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    const reader = new FileReader();

    reader.onload = () => {
      image.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));

    image.onload = () => {
      const maxSize = 1400;
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));

      const context = canvas.getContext("2d");
      if (!context) {
        resolve(String(reader.result));
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };

    image.onerror = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

function buildStoragePath(folder: string, fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase() || "jpg";
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${folder}/${id}.${extension}`;
}
