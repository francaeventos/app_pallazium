import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { getPublicUploadUrl } from "@/lib/local-storage";

const EBOOK_FILE_PREFIX = "/ebook-file/";
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "uploads";

export function isEbookFileRoute(pathname: string) {
  return pathname.startsWith(EBOOK_FILE_PREFIX) && pathname.length > EBOOK_FILE_PREFIX.length;
}

export function ebookIdFromPath(pathname: string) {
  return pathname.slice(EBOOK_FILE_PREFIX.length).split("/")[0] ?? "";
}

function localPathFromPublicUrl(fileUrl: string) {
  const publicBase = process.env.PUBLIC_UPLOAD_URL ?? "/uploads";
  if (!fileUrl.startsWith(publicBase)) return null;
  const relative = fileUrl.slice(publicBase.length).replace(/^\/+/, "");
  return path.join(UPLOAD_DIR, relative);
}

export async function serveEbookPdf(id: string): Promise<Response> {
  const ebook = await db.ebook.findUnique({
    where: { id },
    select: { fileUrl: true, fileName: true, active: true },
  });

  if (!ebook) {
    return new Response("Ebook não encontrado.", { status: 404 });
  }

  const resolvedUrl = getPublicUploadUrl(ebook.fileUrl);

  if (resolvedUrl.startsWith("http://") || resolvedUrl.startsWith("https://")) {
    return Response.redirect(resolvedUrl, 302);
  }

  const filePath = localPathFromPublicUrl(resolvedUrl);
  if (!filePath) {
    return new Response("Arquivo indisponível.", { status: 404 });
  }

  try {
    const bytes = await readFile(filePath);
    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${encodeURIComponent(ebook.fileName)}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new Response("Arquivo indisponível.", { status: 404 });
  }
}
