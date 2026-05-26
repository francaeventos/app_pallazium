import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

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

  return {
    path: `${bucket}/${fileName}`,
    publicUrl: `${PUBLIC_UPLOAD_URL}/${bucket}/${fileName}`,
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
