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
