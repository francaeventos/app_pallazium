export type WebhookLeadPayload = {
  id: string;
  formSlug: string;
  name: string | null;
  email: string | null;
  whatsapp: string | null;
  status: string;
  score: number;
  qualified: boolean;
  answers: Record<string, unknown>;
  utm: Record<string, unknown>;
  slot: string | null;
  sourceUrl: string | null;
  scheduledAt: string | null;
  completedAt: string | null;
  qualifiedAt: string | null;
  createdAt: string;
};

export async function sendLeadWebhook(opts: {
  url: string;
  secret?: string | null;
  payload: WebhookLeadPayload;
}): Promise<{ ok: boolean; status?: number; detail?: string }> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Pallazium-Event": "lead.qualified",
    };
    if (opts.secret) headers["X-Pallazium-Secret"] = opts.secret;

    const res = await fetch(opts.url, {
      method: "POST",
      headers,
      body: JSON.stringify(opts.payload),
    });
    const text = await res.text();
    if (!res.ok) return { ok: false, status: res.status, detail: text.slice(0, 500) };
    return { ok: true, status: res.status, detail: text.slice(0, 200) };
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : "Webhook error" };
  }
}
