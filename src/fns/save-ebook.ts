import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/integrations/auth/auth-middleware";
import { assertAdmin } from "@/lib/auth-session";
import { saveUploadedFile } from "@/lib/local-storage";
import { ebookRecord } from "@/lib/admin-records";

const saveEbookInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(400).optional(),
  cover_url: z.string().trim().max(500).optional(),
  externalFileUrl: z.string().trim().max(2000).optional(),
  fileName: z.string().trim().max(255).optional(),
  fileBase64: z.string().optional(),
  contentType: z.string().optional(),
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

export const saveEbookFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => saveEbookInput.parse(data))
  .handler(async ({ data, context }) => {
    const userId = (context as { userId?: string }).userId;
    if (!userId) throw new Error("Sessão inválida.");
    await assertAdmin(userId);

    let fileUrl = data.externalFileUrl?.trim() || "";
    let fileName = data.fileName?.trim() || "ebook.pdf";
    let fileSize: bigint | null = null;

    if (data.id && !data.fileBase64 && !data.externalFileUrl) {
      const existing = await db.ebook.findUnique({ where: { id: data.id } });
      if (!existing) throw new Error("Ebook não encontrado.");
      fileUrl = existing.fileUrl;
      fileName = existing.fileName;
      fileSize = existing.fileSize;
    }

    if (data.fileBase64) {
      const bytes = decodeBase64(data.fileBase64);
      if (bytes.byteLength > 50 * 1024 * 1024) {
        throw new Error("O arquivo deve ter no máximo 50 MB.");
      }

      fileName = data.fileName?.trim() || fileName;
      fileSize = BigInt(bytes.byteLength);

      const uploaded = await saveUploadedFile(
        "ebooks",
        bytes,
        ".pdf",
        data.contentType || "application/pdf",
      );
      fileUrl = uploaded.publicUrl;
    } else if (data.externalFileUrl?.trim()) {
      fileUrl = data.externalFileUrl.trim();
      fileName = fileUrl.split("/").pop()?.split("?")[0] || fileName;
    }

    if (!fileUrl) throw new Error("Informe um PDF ou URL do arquivo.");

    const payload = {
      title: data.title.trim(),
      description: data.description?.trim() || null,
      coverUrl: data.cover_url?.trim() || null,
      fileUrl,
      fileName,
      fileSize,
    };

    const row = data.id
      ? await db.ebook.update({ where: { id: data.id }, data: payload })
      : await db.ebook.create({ data: payload });

    return ebookRecord(row);
  });
