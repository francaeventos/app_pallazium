import { createHash } from "node:crypto";

export function sha256Hash(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export type CapIUserData = {
  email?: string | null;
  phone?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  clientIp?: string | null;
  userAgent?: string | null;
};

export type CapIEventInput = {
  eventName: "Lead" | "Schedule" | "PageView";
  eventId: string;
  eventSourceUrl?: string | null;
  pixelId: string;
  accessToken: string;
  testEventCode?: string | null;
  user: CapIUserData;
  customData?: Record<string, unknown>;
};

export async function sendMetaCapiEvent(input: CapIEventInput): Promise<{ ok: boolean; detail?: string }> {
  const userData: Record<string, unknown> = {};
  if (input.user.email) userData.em = [sha256Hash(input.user.email)];
  if (input.user.phone) userData.ph = [sha256Hash(input.user.phone.replace(/\D/g, ""))];
  if (input.user.fbp) userData.fbp = input.user.fbp;
  if (input.user.fbc) userData.fbc = input.user.fbc;
  if (input.user.clientIp) userData.client_ip_address = input.user.clientIp;
  if (input.user.userAgent) userData.client_user_agent = input.user.userAgent;

  const body: Record<string, unknown> = {
    data: [
      {
        event_name: input.eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: input.eventId,
        event_source_url: input.eventSourceUrl || undefined,
        action_source: "website",
        user_data: userData,
        custom_data: input.customData,
      },
    ],
  };
  if (input.testEventCode) body.test_event_code = input.testEventCode;

  const url = `https://graph.facebook.com/v21.0/${input.pixelId}/events?access_token=${encodeURIComponent(input.accessToken)}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) return { ok: false, detail: text.slice(0, 500) };
    return { ok: true, detail: text.slice(0, 200) };
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : "CAPI error" };
  }
}

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    fbq?: (...args: unknown[]) => void;
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
  if (document.getElementById("gtm-script")) return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
  const script = document.createElement("script");
  script.id = "gtm-script";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`;
  document.head.appendChild(script);
}

export function ensureMetaPixel(pixelId: string) {
  if (typeof document === "undefined" || !pixelId) return;
  if (document.getElementById("meta-pixel-script")) return;
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
  const script = document.createElement("script");
  script.id = "meta-pixel-script";
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);
  w.fbq("init", pixelId);
  w.fbq("track", "PageView");
}

export function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}
