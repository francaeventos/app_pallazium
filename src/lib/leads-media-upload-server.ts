import path from "node:path";
import { resolveSession, assertAdmin } from "@/lib/auth-session";
import { saveUploadedFile } from "@/lib/local-storage";
import {
  extensionForMedia,
  isMediaKind,
  MEDIA_MAX_BYTES,
  parseMediaKind,
  type MediaKind,
} from "@/lib/leads/media";

const UPLOAD_PATH = "/api/leads/media-upload";

function bearerToken(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return "";
  return auth.slice(7).trim();
}

export async function handleLeadMediaUploadRequest(request: Request): Promise<Response | null> {
  const { pathname } = new URL(request.url);
  if (pathname !== UPLOAD_PATH) return null;

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const token = bearerToken(request);
  if (!token) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }

  const user = await resolveSession(token);
  if (!user) {
    return Response.json({ error: "Sessão inválida." }, { status: 401 });
  }

  try {
    await assertAdmin(user.id);
  } catch {
    return Response.json({ error: "Acesso restrito a administradores." }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Formulário inválido." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Arquivo ausente." }, { status: 400 });
  }

  const kindRaw = String(formData.get("kind") || "image");
  const kind: MediaKind = isMediaKind(kindRaw) ? kindRaw : parseMediaKind(kindRaw);

  if (file.size <= 0 || file.size > MEDIA_MAX_BYTES) {
    return Response.json({ error: "Arquivo deve ter no máximo 100 MB." }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const extension = extensionForMedia(kind, file.name, file.type);
  const contentType = file.type || "application/octet-stream";

  try {
    const result = await saveUploadedFile(
      `leads/media/${kind}`,
      bytes,
      extension,
      contentType,
    );
    return Response.json({
      publicUrl: result.publicUrl,
      kind,
      size: bytes.byteLength,
      fileName: path.basename(result.path),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha no upload.";
    return Response.json({ error: message }, { status: 500 });
  }
}
