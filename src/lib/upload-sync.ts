import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { timingSafeEqual } from "node:crypto";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "uploads";
const PUBLIC_UPLOAD_ORIGIN = (process.env.PUBLIC_UPLOAD_ORIGIN ?? "").replace(/\/$/, "");
const UPLOAD_SYNC_SECRET = process.env.UPLOAD_SYNC_SECRET ?? "";
const UPLOAD_SYNC_PATH = "/api/internal/upload-sync";
const MAX_SYNC_BYTES = 12 * 1024 * 1024;

function secretsMatch(provided: string, expected: string) {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function decodeBase64(base64: string) {
  return Uint8Array.from(Buffer.from(base64, "base64"));
}

/** Recebe arquivo do PC local e grava no disco da VPS. */
export async function handleUploadSyncRequest(request: Request): Promise<Response | null> {
  const { pathname } = new URL(request.url);
  if (pathname !== UPLOAD_SYNC_PATH) return null;
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!UPLOAD_SYNC_SECRET) {
    return new Response("Upload sync desabilitado", { status: 503 });
  }

  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token || !secretsMatch(token, UPLOAD_SYNC_SECRET)) {
    return new Response("Unauthorized", { status: 401 });
  }

  let payload: { relativePath?: unknown; contentType?: unknown; fileBase64?: unknown };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return new Response("JSON inválido", { status: 400 });
  }

  const relativePath = typeof payload.relativePath === "string" ? payload.relativePath.trim() : "";
  const fileBase64 = typeof payload.fileBase64 === "string" ? payload.fileBase64 : "";
  const contentType =
    typeof payload.contentType === "string" && payload.contentType.trim()
      ? payload.contentType.trim()
      : "application/octet-stream";

  if (!relativePath || relativePath.includes("..") || path.isAbsolute(relativePath)) {
    return new Response("Caminho inválido", { status: 400 });
  }
  if (!fileBase64) {
    return new Response("Arquivo ausente", { status: 400 });
  }

  const bytes = decodeBase64(fileBase64);
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_SYNC_BYTES) {
    return new Response("Arquivo inválido ou grande demais", { status: 400 });
  }

  const filePath = path.join(UPLOAD_DIR, relativePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, bytes);

  return Response.json({ ok: true, relativePath, contentType });
}

/** Espelha um upload local para a nuvem (mesmo caminho relativo). */
export async function mirrorUploadToOrigin(
  relativePath: string,
  bytes: Uint8Array,
  contentType?: string,
) {
  if (!PUBLIC_UPLOAD_ORIGIN || !UPLOAD_SYNC_SECRET) return;

  if (bytes.byteLength > MAX_SYNC_BYTES) {
    console.warn(
      `[upload-sync] Arquivo grande demais para espelho (${bytes.byteLength} bytes): ${relativePath}`,
    );
    return;
  }

  const response = await fetch(`${PUBLIC_UPLOAD_ORIGIN}${UPLOAD_SYNC_PATH}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPLOAD_SYNC_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      relativePath,
      contentType,
      fileBase64: Buffer.from(bytes).toString("base64"),
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Não foi possível enviar o arquivo para a nuvem (${response.status}). ${detail}`.trim(),
    );
  }
}
