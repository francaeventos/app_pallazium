import {
  detectMediaKindFromUrl,
  isMediaKind,
  MEDIA_KIND_LABEL,
  type MediaKind,
} from "@/lib/leads/media";

export function resolveQuestionMedia(question: {
  type: string;
  label?: string | null;
  placeholder?: string | null;
}): { kind: MediaKind; url: string } | null {
  if (question.type !== "media") return null;
  const url = (question.placeholder || "").trim();
  if (!url) return null;
  const fromLabel = (question.label || "").trim().toLowerCase();
  const kind = isMediaKind(fromLabel)
    ? fromLabel
    : detectMediaKindFromUrl(url) || "image";
  return { kind, url };
}

export function LeadMediaView({
  kind,
  url,
  className,
}: {
  kind: MediaKind;
  url: string;
  className?: string;
}) {
  if (!url) return null;

  if (kind === "image") {
    return (
      <div className={className || "sf-media"}>
        <img src={url} alt={MEDIA_KIND_LABEL.image} className="sf-media-img" />
      </div>
    );
  }
  if (kind === "video") {
    return (
      <div className={className || "sf-media"}>
        <video src={url} controls playsInline className="sf-media-video" />
      </div>
    );
  }
  if (kind === "audio") {
    return (
      <div className={className || "sf-media sf-media-audio"}>
        <audio src={url} controls />
      </div>
    );
  }
  return (
    <div className={className || "sf-media"}>
      <a className="sf-media-pdf" href={url} target="_blank" rel="noreferrer">
        Abrir PDF
      </a>
    </div>
  );
}
