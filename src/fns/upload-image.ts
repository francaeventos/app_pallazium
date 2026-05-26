import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/integrations/auth/auth-middleware";
import { saveUploadedFile } from "@/lib/local-storage";

const uploadImageSchema = z.object({
  bucket: z.string().trim().min(1).max(64),
  folder: z.string().trim().min(1).max(120).optional(),
  fileBase64: z.string().min(1),
  contentType: z.string().trim().min(1).max(128),
  fileName: z.string().trim().min(1).max(255).optional(),
});

function decodeBase64(base64: string) {
  if (typeof Buffer !== "undefined") {
    return Uint8Array.from(Buffer.from(base64, "base64"));
  }

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function extensionFromContentType(contentType: string, fileName?: string) {
  const fromName = fileName?.split(".").pop()?.toLowerCase();
  if (fromName && fromName.length <= 5) return `.${fromName}`;

  switch (contentType) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    default:
      return ".jpg";
  }
}

export const uploadImageFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => uploadImageSchema.parse(data))
  .handler(async ({ data }) => {
    const bytes = decodeBase64(data.fileBase64);
    const maxSize = 10 * 1024 * 1024;
    if (bytes.byteLength > maxSize) {
      throw new Error("A imagem precisa ter no máximo 10 MB.");
    }

    const extension = extensionFromContentType(data.contentType, data.fileName);
    const folder = data.folder?.trim() || "uploads";
    const result = await saveUploadedFile(`${data.bucket}/${folder}`, bytes, extension, data.contentType);
    return { publicUrl: result.publicUrl };
  });
