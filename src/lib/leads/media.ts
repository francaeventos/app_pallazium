export const MEDIA_KINDS = ["image", "video", "audio", "pdf"] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export const MEDIA_MAX_BYTES = 100 * 1024 * 1024; // 100 MB

export const MEDIA_KIND_LABEL: Record<MediaKind, string> = {
  image: "Imagem",
  video: "Vídeo",
  audio: "Áudio",
  pdf: "PDF",
};

export const MEDIA_ACCEPT: Record<MediaKind, string> = {
  image: "image/jpeg,image/png,image/webp,image/gif",
  video: "video/mp4,video/webm,video/quicktime",
  audio: "audio/mpeg,audio/mp4,audio/wav,audio/ogg,audio/webm,audio/x-m4a",
  pdf: "application/pdf",
};

const MIME_TO_KIND: Array<{ kind: MediaKind; test: (mime: string) => boolean }> = [
  { kind: "image", test: (m) => m.startsWith("image/") },
  { kind: "video", test: (m) => m.startsWith("video/") },
  { kind: "audio", test: (m) => m.startsWith("audio/") },
  { kind: "pdf", test: (m) => m === "application/pdf" },
];

export function isMediaKind(value: string | null | undefined): value is MediaKind {
  return MEDIA_KINDS.includes((value || "") as MediaKind);
}

export function parseMediaKind(label: string | null | undefined): MediaKind {
  const raw = (label || "").trim().toLowerCase();
  if (isMediaKind(raw)) return raw;
  return "image";
}

export function detectMediaKindFromMime(mime: string): MediaKind | null {
  const normalized = mime.trim().toLowerCase();
  for (const row of MIME_TO_KIND) {
    if (row.test(normalized)) return row.kind;
  }
  return null;
}

export function detectMediaKindFromUrl(url: string): MediaKind | null {
  const path = url.split("?")[0].split("#")[0].toLowerCase();
  if (/\.(jpg|jpeg|png|webp|gif)$/.test(path)) return "image";
  if (/\.(mp4|webm|mov|m4v)$/.test(path)) return "video";
  if (/\.(mp3|wav|ogg|m4a|aac)$/.test(path)) return "audio";
  if (/\.pdf$/.test(path)) return "pdf";
  return null;
}

export function extensionForMedia(kind: MediaKind, fileName?: string, mime?: string) {
  const fromName = fileName?.split(".").pop()?.toLowerCase();
  if (fromName && fromName.length <= 5) return `.${fromName}`;

  switch (mime) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    case "video/mp4":
      return ".mp4";
    case "video/webm":
      return ".webm";
    case "video/quicktime":
      return ".mov";
    case "audio/mpeg":
      return ".mp3";
    case "audio/wav":
      return ".wav";
    case "audio/ogg":
      return ".ogg";
    case "audio/mp4":
    case "audio/x-m4a":
      return ".m4a";
    case "application/pdf":
      return ".pdf";
    default:
      break;
  }

  switch (kind) {
    case "image":
      return ".jpg";
    case "video":
      return ".mp4";
    case "audio":
      return ".mp3";
    case "pdf":
      return ".pdf";
  }
}

export function validateMediaFile(file: File, kind: MediaKind): string | null {
  if (file.size <= 0) return "Arquivo vazio.";
  if (file.size > MEDIA_MAX_BYTES) return "Arquivo deve ter no máximo 100 MB.";
  const detected = detectMediaKindFromMime(file.type);
  if (detected && detected !== kind) {
    return `Este arquivo parece ser ${MEDIA_KIND_LABEL[detected].toLowerCase()}, não ${MEDIA_KIND_LABEL[kind].toLowerCase()}.`;
  }
  if (!detected && file.type) {
    // MIME desconhecido: ainda permite se a extensão bater
    const byName = detectMediaKindFromUrl(file.name);
    if (byName && byName !== kind) {
      return `Extensão incompatível com ${MEDIA_KIND_LABEL[kind].toLowerCase()}.`;
    }
  }
  return null;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
