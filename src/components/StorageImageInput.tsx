import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadImageFn } from "@/fns/upload-image";
import { fileToBase64 } from "@/lib/file-base64";
import { Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

type StorageImageInputProps = {
  bucket: string;
  name: string;
  label: string;
  defaultValue?: string | null;
  folder?: string;
  onValueChange?: (url: string) => void;
  /** Oculta o caminho técnico bucket/folder (útil em telas de operação). */
  hideFolderHint?: boolean;
  /** Classes extras no preview da imagem. */
  previewClassName?: string;
  /** Dimensão ideal sugerida para a imagem, ex.: "1600 x 900 pixels". */
  recommendedSize?: string;
};

export function StorageImageInput({
  bucket,
  name,
  label,
  defaultValue,
  folder = "uploads",
  onValueChange,
  hideFolderHint = false,
  previewClassName,
  recommendedSize,
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
    try {
      const { publicUrl } = await uploadImageFn({
        data: {
          bucket,
          folder,
          fileName: file.name,
          fileBase64: await fileToBase64(file),
          contentType: file.type,
        },
      });

      setUrl(publicUrl);
      onValueChange?.(publicUrl);
      toast.success("Imagem enviada");
    } catch (error) {
      console.error("Upload error", { bucket, folder, error });
      const fallbackUrl = await imageToDataUrl(file);
      setUrl(fallbackUrl);
      onValueChange?.(fallbackUrl);
      toast.warning("Upload indisponível. A imagem foi salva no cadastro.");
    } finally {
      setUploading(false);
    }
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
        <div className="relative">
          <div
            className={
              previewClassName ??
              "h-28 rounded-xl border bg-muted bg-cover bg-center"
            }
            style={{ backgroundImage: `url(${url})` }}
          />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute right-2 top-2 h-8 w-8 shadow"
            title="Remover imagem"
            onClick={() => {
              setUrl("");
              onValueChange?.("");
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
      {recommendedSize && (
        <p className="text-xs text-muted-foreground">
          Tamanho ideal: <span className="font-medium">{recommendedSize}</span>
        </p>
      )}
      {!hideFolderHint && (
        <p className="text-xs text-muted-foreground">
          Pasta: <span className="font-medium">{bucket}/{folder}</span>
        </p>
      )}
    </div>
  );
}

export function StorageImagesTextarea({
  bucket,
  name,
  label,
  defaultValue,
  folder = "uploads",
}: StorageImageInputProps) {
  const [images, setImages] = useState(() => splitImageLines(defaultValue ?? ""));
  const [manualUrl, setManualUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setImages(splitImageLines(defaultValue ?? ""));
  }, [defaultValue]);

  const addImages = (urls: string[]) => {
    setImages((current) => [...current, ...urls.filter(Boolean)]);
  };

  const removeImage = (index: number) => {
    setImages((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const addManualUrl = () => {
    const cleanUrl = manualUrl.trim();
    if (!cleanUrl) return;
    addImages([cleanUrl]);
    setManualUrl("");
  };

  const upload = async (files?: FileList | null) => {
    const fileItems = Array.from(files ?? []);
    if (fileItems.length === 0) return;

    for (const file of fileItems) {
      const validationError = validateImageFile(file);
      if (validationError) return toast.error(validationError);
    }

    setUploading(true);
    const uploadedUrls: string[] = [];

    for (const file of fileItems) {
      try {
        const { publicUrl } = await uploadImageFn({
          data: {
            bucket,
            folder,
            fileName: file.name,
            fileBase64: await fileToBase64(file),
            contentType: file.type,
          },
        });
        uploadedUrls.push(publicUrl);
      } catch (error) {
        console.error("Upload error", { bucket, folder, error });
        uploadedUrls.push(await imageToDataUrl(file));
      }
    }

    setUploading(false);
    if (uploadedUrls.length === 0) return;

    addImages(uploadedUrls);
    toast.success(
      uploadedUrls.length === 1
        ? "Imagem adicionada"
        : `${uploadedUrls.length} imagens adicionadas`,
    );
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <textarea name={name} value={images.join("\n")} readOnly className="hidden" />
      {images.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {images.map((image, index) => (
            <div
              key={`${image}-${index}`}
              className="group relative overflow-hidden rounded-xl border"
            >
              <div
                className="h-24 bg-muted bg-cover bg-center"
                style={{ backgroundImage: `url(${image})` }}
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute right-1 top-1 h-7 w-7 p-0 opacity-90"
                onClick={() => removeImage(index)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nenhuma foto adicionada ainda.
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <Input
          type="text"
          value={manualUrl}
          onChange={(event) => setManualUrl(event.target.value)}
          placeholder="Colar URL de imagem"
        />
        <Button type="button" variant="outline" onClick={addManualUrl}>
          <Upload className="mr-1 h-4 w-4" />
          Adicionar URL
        </Button>
      </div>
      <Button type="button" variant="outline" disabled={uploading} asChild>
        <label className="cursor-pointer">
          <Upload className="mr-1 h-4 w-4" />
          {uploading ? "Enviando..." : "Adicionar fotos"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            multiple
            className="sr-only"
            onChange={(event) => upload(event.target.files)}
          />
        </label>
      </Button>
      <p className="text-xs text-muted-foreground">
        Pasta: <span className="font-medium">{bucket}/{folder}</span>. Você pode enviar várias fotos.
      </p>
    </div>
  );
}

function splitImageLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
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
