import "./lib/error-capture";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { ebookIdFromPath, isEbookFileRoute, serveEbookPdf } from "./lib/ebook-file-server";
import { handleUploadSyncRequest } from "./lib/upload-sync";
import { handleLeadMediaUploadRequest } from "./lib/leads-media-upload-server";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "uploads";
const PUBLIC_UPLOAD_URL = process.env.PUBLIC_UPLOAD_URL ?? "/uploads";
/** Origem remota dos arquivos quando o banco é compartilhado (ex.: VPS) e o disco local não tem o upload. */
const PUBLIC_UPLOAD_ORIGIN = (process.env.PUBLIC_UPLOAD_ORIGIN ?? "").replace(/\/$/, "");

const MIME_BY_EXTENSION: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".m4v": "video/mp4",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
};

async function serveUpload(pathname: string): Promise<Response | null> {
  if (!pathname.startsWith(`${PUBLIC_UPLOAD_URL}/`)) return null;

  const relativePath = pathname.slice(PUBLIC_UPLOAD_URL.length + 1);
  if (!relativePath || relativePath.includes("..")) {
    return new Response("Not found", { status: 404 });
  }

  const filePath = path.join(UPLOAD_DIR, relativePath);
  try {
    const bytes = await readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    const contentType = MIME_BY_EXTENSION[extension] ?? "application/octet-stream";
    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    // Mesmo Postgres da nuvem, disco diferente: avatar/wallpaper vivem na VPS.
    if (PUBLIC_UPLOAD_ORIGIN) {
      return Response.redirect(`${PUBLIC_UPLOAD_ORIGIN}${pathname}`, 302);
    }
    return new Response("Not found", { status: 404 });
  }
}

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const { pathname } = new URL(request.url);
      const syncResponse = await handleUploadSyncRequest(request);
      if (syncResponse) return syncResponse;

      const mediaUploadResponse = await handleLeadMediaUploadRequest(request);
      if (mediaUploadResponse) return mediaUploadResponse;

      if (request.method === "GET" || request.method === "HEAD") {
        const uploadResponse = await serveUpload(pathname);
        if (uploadResponse) {
          if (request.method === "HEAD") {
            return new Response(null, {
              status: uploadResponse.status,
              headers: uploadResponse.headers,
            });
          }
          return uploadResponse;
        }
      }
      if (request.method === "GET" && isEbookFileRoute(pathname)) {
        return serveEbookPdf(ebookIdFromPath(pathname));
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return brandedErrorResponse();
    }
  },
};
