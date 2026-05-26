import { saveUploadedFile, getPublicUploadUrl } from "@/lib/local-storage";

type UploadOptions = {
  bucket: string;
  path: string;
  bytes: Uint8Array;
  contentType?: string;
};

/** Upload server-side para PDFs e outros arquivos (ex.: ebooks). */
export async function uploadToStorage({ bucket, path, bytes, contentType }: UploadOptions) {
  const extension = path.includes(".") ? `.${path.split(".").pop()}` : "";
  const folder = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "uploads";
  const storageKey = folder ? `${bucket}/${folder}` : bucket;

  try {
    const result = await saveUploadedFile(storageKey, bytes, extension || ".bin", contentType);
    return { error: null as null, publicUrl: result.publicUrl };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error("Falha no upload"),
      publicUrl: null as null,
    };
  }
}

export function getPublicStorageUrl(bucket: string, path: string) {
  return getPublicUploadUrl(`${bucket}/${path}`);
}

export function formatStorageError(error: Error) {
  const message = error.message.toLowerCase();

  if (message.includes("enoent") || message.includes("not found")) {
    return "Diretório de upload não encontrado. Verifique UPLOAD_DIR no ambiente.";
  }

  if (message.includes("eacces") || message.includes("permission")) {
    return "Sem permissão para gravar arquivos no servidor.";
  }

  return error.message;
}

export const EBOOK_UPLOAD_BUCKETS = [{ bucket: "ebooks", prefix: "uploads" }] as const;
