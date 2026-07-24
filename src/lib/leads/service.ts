import { db } from "@/lib/db";
import {
  bandsFromForm,
  computeLeadScore,
  meetsConversionTemperature,
  type ConversionMinTemperature,
  type LeadTemperature,
} from "@/lib/leads/score";
import { sendMetaCapiEvent } from "@/lib/leads/tracking.server";
import { sendLeadWebhook, type WebhookLeadPayload } from "@/lib/leads/webhook";
import type { Lead, LeadForm, LeadIntegrationSettings, Prisma } from "@/generated/prisma/client";

export function serializeLeadForWebhook(
  lead: Lead,
  formSlug: string,
): WebhookLeadPayload {
  return {
    id: lead.id,
    formSlug,
    name: lead.name,
    email: lead.email,
    whatsapp: lead.whatsapp,
    status: lead.status,
    score: lead.score,
    qualified: lead.qualified,
    answers: (lead.answers as Record<string, unknown>) ?? {},
    utm: (lead.utm as Record<string, unknown>) ?? {},
    slot: lead.slot,
    sourceUrl: lead.sourceUrl,
    scheduledAt: lead.scheduledAt?.toISOString() ?? null,
    completedAt: lead.completedAt?.toISOString() ?? null,
    qualifiedAt: lead.qualifiedAt?.toISOString() ?? null,
    createdAt: lead.createdAt.toISOString(),
  };
}

export async function recordLeadEvent(
  leadId: string,
  type:
    | "partial_created"
    | "completed"
    | "qualified"
    | "scheduled"
    | "webhook_sent"
    | "webhook_failed"
    | "capi_sent"
    | "capi_failed",
  payload: Record<string, unknown> = {},
) {
  await db.leadEvent.create({
    data: {
      leadId,
      type,
      payload: payload as Prisma.InputJsonValue,
    },
  });
}

export async function maybeSendQualifiedWebhook(
  lead: Lead,
  form: LeadForm,
  settings: LeadIntegrationSettings | null,
) {
  if (!lead.qualified) return;
  const url = settings?.webhookUrl || process.env.LEAD_WEBHOOK_URL || null;
  const enabled = settings?.webhookEnabled ?? true;
  if (!enabled || !url) return;

  const already = await db.leadEvent.findFirst({
    where: { leadId: lead.id, type: "webhook_sent" },
  });
  if (already) return;

  const secret = settings?.webhookSecret || process.env.LEAD_WEBHOOK_SECRET || null;
  const result = await sendLeadWebhook({
    url,
    secret,
    payload: serializeLeadForWebhook(lead, form.slug),
  });

  await recordLeadEvent(lead.id, result.ok ? "webhook_sent" : "webhook_failed", {
    status: result.status,
    detail: result.detail,
  });
}

export function shouldSendPaidConversion(
  temperature: LeadTemperature,
  settings: LeadIntegrationSettings | null,
) {
  const min = (settings?.conversionMinTemperature ?? "quente") as ConversionMinTemperature;
  return meetsConversionTemperature(temperature, min);
}

export async function maybeSendCapi(
  lead: Lead,
  settings: LeadIntegrationSettings | null,
  eventName: "Lead" | "Schedule",
  eventId: string,
) {
  const pixelId = settings?.metaPixelId || process.env.META_PIXEL_ID || null;
  const accessToken = settings?.metaAccessToken || process.env.META_CAPI_TOKEN || null;
  const enabled = settings?.capiEnabled ?? true;
  if (!enabled || !pixelId || !accessToken) return;

  const temperature = (lead.temperature ?? "frio") as LeadTemperature;
  if (!shouldSendPaidConversion(temperature, settings)) return;

  const result = await sendMetaCapiEvent({
    eventName,
    eventId,
    eventSourceUrl: lead.sourceUrl,
    pixelId,
    accessToken,
    testEventCode: settings?.metaTestEventCode || process.env.META_TEST_EVENT_CODE || null,
    user: {
      email: lead.email,
      phone: lead.whatsapp,
      fbp: lead.fbp,
      fbc: lead.fbc,
    },
    customData: {
      lead_id: lead.id,
      score: lead.score,
      qualified: lead.qualified,
      temperature,
      status: lead.status,
    },
  });

  await recordLeadEvent(lead.id, result.ok ? "capi_sent" : "capi_failed", {
    eventName,
    eventId,
    detail: result.detail,
  });
}

export async function loadFormQuestionsForScore(formId: string) {
  const questions = await db.leadFormQuestion.findMany({
    where: { formId, active: true },
    orderBy: { sortOrder: "asc" },
    include: {
      options: {
        where: { active: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  return questions.map((q) => ({
    key: q.key,
    type: q.type,
    scoreBonus: q.scoreBonus,
    options: q.options.map((o) => ({
      id: o.id,
      label: o.label,
      scorePoints: o.scorePoints,
    })),
  }));
}

export function scoreLeadAnswers(
  answers: Record<string, string>,
  questions: Awaited<ReturnType<typeof loadFormQuestionsForScore>>,
  formOrThreshold:
    | number
    | {
        scoreColdMax?: number;
        scoreWarmMax?: number;
        scoreHotMax?: number;
        qualificationThreshold?: number;
      },
) {
  const bands =
    typeof formOrThreshold === "number"
      ? formOrThreshold
      : bandsFromForm(formOrThreshold);
  return computeLeadScore(answers, questions, bands);
}
