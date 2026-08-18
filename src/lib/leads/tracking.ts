declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    fbq?: (...args: unknown[]) => void;
    oaiq?: ((...args: unknown[]) => void) & { q?: unknown[] };
  }
}

export function pushDataLayer(event: string, payload: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...payload });
}

export function trackPixel(eventName: string, params: Record<string, unknown> = {}, eventId?: string) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  if (eventId) window.fbq("track", eventName, params, { eventID: eventId });
  else window.fbq("track", eventName, params);
}

export function ensureGtm(gtmId: string) {
  if (typeof document === "undefined" || !gtmId) return;
  const existing = document.getElementById("gtm-script");
  if (existing?.getAttribute("data-gtm-id") === gtmId) return;
  if (existing) existing.remove();

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });

  const script = document.createElement("script");
  script.id = "gtm-script";
  script.async = true;
  script.setAttribute("data-gtm-id", gtmId);
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`;
  document.head.appendChild(script);

  if (!document.getElementById("gtm-noscript")) {
    const noscript = document.createElement("noscript");
    noscript.id = "gtm-noscript";
    noscript.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(gtmId)}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
    document.body.prepend(noscript);
  }
}

export function ensureMetaPixel(pixelId: string) {
  if (typeof document === "undefined" || !pixelId) return;
  const existing = document.getElementById("meta-pixel-script");
  if (existing?.getAttribute("data-pixel-id") === pixelId) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (!w.fbq) {
    const n: any = (w.fbq = function (...args: unknown[]) {
      n.callMethod ? n.callMethod(...args) : n.queue.push(args);
    });
    if (!w._fbq) w._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
  }

  if (existing) existing.remove();
  const script = document.createElement("script");
  script.id = "meta-pixel-script";
  script.async = true;
  script.setAttribute("data-pixel-id", pixelId);
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);

  w.fbq("init", pixelId);
  w.fbq("track", "PageView");

  if (!document.getElementById("meta-pixel-noscript")) {
    const noscript = document.createElement("noscript");
    noscript.id = "meta-pixel-noscript";
    noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${encodeURIComponent(pixelId)}&ev=PageView&noscript=1" alt="" />`;
    document.body.appendChild(noscript);
  }
}

export function ensureOpenAiPixel(pixelId: string, debug = false) {
  if (typeof document === "undefined" || !pixelId) return;
  const existing = document.getElementById("openai-pixel-script");
  if (existing?.getAttribute("data-pixel-id") === pixelId) return;

  if (!window.oaiq) {
    const q = ((...args: unknown[]) => {
      q.q!.push(args);
    }) as ((...args: unknown[]) => void) & { q?: unknown[] };
    q.q = [];
    window.oaiq = q;
  }

  if (existing) existing.remove();
  const script = document.createElement("script");
  script.id = "openai-pixel-script";
  script.async = true;
  script.setAttribute("data-pixel-id", pixelId);
  script.src = "https://bzrcdn.openai.com/sdk/oaiq.min.js";
  document.head.appendChild(script);

  window.oaiq("init", { pixelId, debug });
}

export function trackOpenAiEvent(eventName: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined" || typeof window.oaiq !== "function") return;
  window.oaiq("measure", eventName, params);
}

export function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/** Monta fbc a partir do fbclid da URL quando o cookie ainda não existe. */
export function resolveFbc(): string | undefined {
  const fromCookie = readCookie("_fbc");
  if (fromCookie) return fromCookie;
  if (typeof window === "undefined") return undefined;
  const fbclid = new URLSearchParams(window.location.search).get("fbclid");
  if (!fbclid) return undefined;
  return `fb.1.${Date.now()}.${fbclid}`;
}

export function resolveFbp(): string | undefined {
  return readCookie("_fbp") || undefined;
}
