import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { mirrorUploadToOrigin } from "@/lib/upload-sync";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "uploads";
const PUBLIC_UPLOAD_URL = process.env.PUBLIC_UPLOAD_URL ?? "/uploads";

export async function saveUploadedFile(
  bucket: string,
  bytes: Uint8Array,
  extension: string,
  contentType?: string,
) {
  const dir = path.join(UPLOAD_DIR, bucket);
  await mkdir(dir, { recursive: true });

  const fileName = `${crypto.randomUUID()}${extension}`;
  const filePath = path.join(dir, fileName);
  await writeFile(filePath, bytes);

  const relativePath = `${bucket}/${fileName}`;
  await mirrorUploadToOrigin(relativePath, bytes, contentType);

  return {
    path: relativePath,
    publicUrl: `${PUBLIC_UPLOAD_URL}/${relativePath}`,
    contentType,
  };
}

export function getPublicUploadUrl(relativePath: string) {
  if (!relativePath) return "";
  if (relativePath.startsWith("http://") || relativePath.startsWith("https://")) {
    return relativePath;
  }
  if (relativePath.startsWith("/")) return relativePath;
  return `${PUBLIC_UPLOAD_URL}/${relativePath.replace(/^\/+/, "")}`;
}
