import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { resolveDiagnosis } from "@/lib/leads/diagnosis";
import { normalizePhone, validateWhatsApp } from "@/lib/leads/phone";
import { buildAgendaSlots } from "@/lib/leads/slots";
import {
  loadFormQuestionsForScore,
  maybeSendCapi,
  maybeSendQualifiedWebhook,
  recordLeadEvent,
  scoreLeadAnswers,
} from "@/lib/leads/service";

const slugSchema = z.object({ slug: z.string().trim().min(1).default("leads") });

const utmSchema = z
  .object({
    utm_source: z.string().optional(),
    utm_medium: z.string().optional(),
    utm_campaign: z.string().optional(),
    utm_term: z.string().optional(),
    utm_content: z.string().optional(),
    gclid: z.string().optional(),
    fbclid: z.string().optional(),
  })
  .passthrough()
  .default({});

function publicFormShape(form: {
  id: string;
  slug: string;
  title: string;
  brandName: string;
  agentName: string;
  agentTitle: string | null;
  agentAvatarUrl: string | null;
  primaryColor: string;
  wallpaperUrl: string | null;
  wallpaperDarkUrl: string | null;
  headerSubtitle: string | null;
  whatsappDestination: string;
  whatsappMessage: string | null;
  privacyUrl: string | null;
  termsUrl: string | null;
  qualificationThreshold: number;
  scoreColdMax: number;
  scoreWarmMax: number;
  scoreHotMax: number;
  botDelayMs: number;
  seoTitle: string | null;
  seoDescription: string | null;
  pageBgLight: string | null;
  pageBgDark: string | null;
  agendaEnabled: boolean;
  questions: Array<{
    id: string;
    key: string;
    type: string;
    label: string | null;
    prompt: string | null;
    botMessages: string[];
    placeholder: string | null;
    sortOrder: number;
    required: boolean;
    options: Array<{ id: string; label: string; sortOrder: number }>;
  }>;
  rules: Array<{
    title: string;
    body: string;
    matchKey: string | null;
    matchValue: string | null;
    isFallback: boolean;
    sortOrder: number;
  }>;
  integrations: {
    gtmId: string | null;
    metaPixelId: string | null;
    pixelEnabled: boolean;
    gtmEnabled: boolean;
  } | null;
}) {
  return {
    id: form.id,
    slug: form.slug,
    title: form.title,
    brandName: form.brandName,
    agentName: form.agentName,
    agentTitle: form.agentTitle,
    agentAvatarUrl: form.agentAvatarUrl,
    primaryColor: form.primaryColor,
    wallpaperUrl: form.wallpaperUrl,
    wallpaperDarkUrl: form.wallpaperDarkUrl,
    headerSubtitle: form.headerSubtitle,
    whatsappDestination: form.whatsappDestination,
    whatsappMessage: form.whatsappMessage,
    privacyUrl: form.privacyUrl,
    termsUrl: form.termsUrl,
    qualificationThreshold: form.qualificationThreshold,
    scoreColdMax: form.scoreColdMax,
    scoreWarmMax: form.scoreWarmMax,
    scoreHotMax: form.scoreHotMax,
    botDelayMs: form.botDelayMs,
    seoTitle: form.seoTitle,
    seoDescription: form.seoDescription,
    pageBgLight: form.pageBgLight,
    pageBgDark: form.pageBgDark,
    agendaEnabled: form.agendaEnabled,
    questions: form.questions.map((q) => ({
      id: q.id,
      key: q.key,
      type: q.type,
      label: q.label,
      prompt: q.prompt,
      botMessages: q.botMessages,
      placeholder: q.placeholder,
      sortOrder: q.sortOrder,
      required: q.required,
      options: q.options.map((o) => ({ id: o.id, label: o.label, sortOrder: o.sortOrder })),
    })),
    rules: form.rules,
    tracking: resolvePublicTracking(form.integrations),
  };
}

function resolvePublicTracking(
  integrations: {
    gtmId: string | null;
    metaPixelId: string | null;
    pixelEnabled: boolean;
    gtmEnabled: boolean;
  } | null,
) {
  const gtmEnabled = integrations?.gtmEnabled ?? true;
  const pixelEnabled = integrations?.pixelEnabled ?? true;
  const gtmId =
    (gtmEnabled ? integrations?.gtmId || process.env.LEAD_GTM_ID || null : null)?.trim() || null;
  const metaPixelId =
    (pixelEnabled ? integrations?.metaPixelId || process.env.META_PIXEL_ID || null : null)?.trim() ||
    null;
  return { gtmId, metaPixelId, gtmEnabled, pixelEnabled };
}

async function getActiveForm(slug: string) {
  const form = await db.leadForm.findFirst({
    where: { slug, active: true },
    include: {
      questions: {
        where: { active: true },
        orderBy: { sortOrder: "asc" },
        include: {
          options: { where: { active: true }, orderBy: { sortOrder: "asc" } },
        },
      },
      rules: { where: { active: true }, orderBy: { sortOrder: "asc" } },
      integrations: true,
    },
  });
  if (!form) throw new Error("Formulário de leads não encontrado.");

  if (!form.integrations) {
    const created = await db.leadIntegrationSettings.create({
      data: {
        formId: form.id,
        gtmId: process.env.LEAD_GTM_ID || null,
        metaPixelId: process.env.META_PIXEL_ID || null,
        metaAccessToken: process.env.META_CAPI_TOKEN || null,
        webhookUrl: process.env.LEAD_WEBHOOK_URL || null,
        webhookSecret: process.env.LEAD_WEBHOOK_SECRET || null,
      },
    });
    return { ...form, integrations: created };
  }

  return form;
}

export const getPublicLeadFormFn = createServerFn({ method: "GET" })
  .inputValidator((data) => slugSchema.parse(data ?? { slug: "leads" }))
  .handler(async ({ data }) => {
    const form = await getActiveForm(data.slug);
    return publicFormShape(form);
  });

export const getPublicAgendaSlotsFn = createServerFn({ method: "GET" })
  .inputValidator((data) => slugSchema.parse(data ?? { slug: "leads" }))
  .handler(async ({ data }) => {
    const form = await getActiveForm(data.slug);
    if (!form.agendaEnabled) return { slots: [] as ReturnType<typeof buildAgendaSlots> };

    const booked = await db.lead.groupBy({
      by: ["slot"],
      where: {
        formId: form.id,
        slot: { not: null },
        status: { in: ["agendado", "completo"] },
      },
      _count: { _all: true },
    });
    const bookedCounts: Record<string, number> = {};
    for (const row of booked) {
      if (row.slot) bookedCounts[row.slot] = row._count._all;
    }

    return {
      slots: buildAgendaSlots(
        {
          weekdays: form.agendaWeekdays,
          times: form.agendaTimes,
          daysAhead: form.agendaDaysAhead,
          leadHours: form.agendaLeadHours,
          capacityPerSlot: form.agendaSlotsPerSlot,
        },
        bookedCounts,
      ),
    };
  });

const partialSchema = z.object({
  slug: z.string().trim().min(1).default("leads"),
  leadId: z.string().uuid().optional(),
  anonId: z.string().trim().min(8).max(80).optional(),
  name: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().email().max(255).optional(),
  whatsapp: z.string().trim().min(8).max(30),
  answers: z.record(z.string()).default({}),
  utm: utmSchema,
  fbp: z.string().optional(),
  fbc: z.string().optional(),
  sourceUrl: z.string().url().optional().or(z.literal("")).optional(),
});

export const upsertLeadPartialFn = createServerFn({ method: "POST" })
  .inputValidator((data) => partialSchema.parse(data))
  .handler(async ({ data }) => {
    const form = await getActiveForm(data.slug);
    const phoneError = validateWhatsApp(data.whatsapp);
    if (phoneError) throw new Error(phoneError);
    const whatsapp = normalizePhone(data.whatsapp);

    const answers = {
      ...data.answers,
      ...(data.name ? { nome: data.name } : {}),
      ...(data.email ? { email: data.email } : {}),
      whatsapp: data.whatsapp,
    } as Record<string, string>;

    let lead =
      (data.leadId
        ? await db.lead.findFirst({ where: { id: data.leadId, formId: form.id } })
        : null) ??
      (await db.lead.findFirst({
        where: {
          formId: form.id,
          whatsapp,
          status: { in: ["parcial", "completo"] },
        },
        orderBy: { updatedAt: "desc" },
      }));

    const base = {
      anonId: data.anonId ?? lead?.anonId ?? randomUUID(),
      name: data.name ?? lead?.name ?? null,
      email: data.email ?? lead?.email ?? null,
      whatsapp,
      answers: answers as Prisma.InputJsonValue,
      utm: (data.utm ?? {}) as Prisma.InputJsonValue,
      fbp: data.fbp ?? lead?.fbp ?? null,
      fbc: data.fbc ?? lead?.fbc ?? null,
      sourceUrl: data.sourceUrl || lead?.sourceUrl || null,
      status: lead?.status === "agendado" ? lead.status : ("parcial" as const),
    };

    if (lead) {
      lead = await db.lead.update({ where: { id: lead.id }, data: base });
    } else {
      lead = await db.lead.create({
        data: { formId: form.id, ...base },
      });
      await recordLeadEvent(lead.id, "partial_created", { whatsapp });
    }

    return { leadId: lead.id, anonId: lead.anonId };
  });

const completeSchema = z.object({
  slug: z.string().trim().min(1).default("leads"),
  leadId: z.string().uuid().optional(),
  anonId: z.string().trim().min(8).max(80).optional(),
  answers: z.record(z.string()),
  utm: utmSchema,
  fbp: z.string().optional(),
  fbc: z.string().optional(),
  sourceUrl: z.string().url().optional().or(z.literal("")).optional(),
});

export const completeLeadFn = createServerFn({ method: "POST" })
  .inputValidator((data) => completeSchema.parse(data))
  .handler(async ({ data }) => {
    const form = await getActiveForm(data.slug);
    const answers = { ...data.answers };
    const name = answers.nome?.trim();
    const email = answers.email?.trim();
    const whatsappRaw = answers.whatsapp?.trim();
    if (!name || name.length < 2) throw new Error("Informe seu nome.");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      throw new Error("Informe um e-mail válido.");
    }
    if (!whatsappRaw) throw new Error("Informe o WhatsApp.");
    const phoneError = validateWhatsApp(whatsappRaw);
    if (phoneError) throw new Error(phoneError);
    const whatsapp = normalizePhone(whatsappRaw);

    for (const q of form.questions) {
      if (!q.required) continue;
      const value = answers[q.key];
      if (!value || !String(value).trim()) {
        throw new Error(`Resposta obrigatória: ${q.prompt || q.label || q.key}`);
      }
    }

    const scoreQuestions = await loadFormQuestionsForScore(form.id);
    const scored = scoreLeadAnswers(answers, scoreQuestions, form);
    const eventId = randomUUID();

    let lead =
      (data.leadId
        ? await db.lead.findFirst({ where: { id: data.leadId, formId: form.id } })
        : null) ??
      (await db.lead.findFirst({
        where: { formId: form.id, whatsapp },
        orderBy: { updatedAt: "desc" },
      }));

    const wasQualified = lead?.qualified ?? false;
    const payload = {
      anonId: data.anonId ?? lead?.anonId ?? randomUUID(),
      name,
      email,
      whatsapp,
      answers: answers as Prisma.InputJsonValue,
      utm: (data.utm ?? {}) as Prisma.InputJsonValue,
      fbp: data.fbp ?? lead?.fbp ?? null,
      fbc: data.fbc ?? lead?.fbc ?? null,
      sourceUrl: data.sourceUrl || lead?.sourceUrl || null,
      score: scored.score,
      temperature: scored.temperature,
      qualified: scored.qualified,
      status: lead?.status === "agendado" ? ("agendado" as const) : ("completo" as const),
      completedAt: new Date(),
      qualifiedAt: scored.qualified ? lead?.qualifiedAt ?? new Date() : null,
      eventId,
    };

    if (lead) {
      lead = await db.lead.update({ where: { id: lead.id }, data: payload });
    } else {
      lead = await db.lead.create({
        data: { formId: form.id, ...payload },
      });
    }

    await recordLeadEvent(lead.id, "completed", {
      score: scored.score,
      temperature: scored.temperature,
      qualified: scored.qualified,
      breakdown: scored.breakdown,
      eventId,
    });

    if (scored.qualified && !wasQualified) {
      await recordLeadEvent(lead.id, "qualified", {
        score: scored.score,
        temperature: scored.temperature,
      });
    }

    const settings = form.integrations;
    // Conversão CAPI: respeita temperatura mínima; webhook: leads quentes+
    if (scored.qualified) {
      await maybeSendCapi(lead, settings, "Lead", eventId);
      await maybeSendQualifiedWebhook(lead, form, settings);
    } else {
      // Ainda pode contar como conversão Ads/Meta se o filtro for "any"/"morno"
      await maybeSendCapi(lead, settings, "Lead", eventId);
    }

    const diagnosis = resolveDiagnosis(
      answers,
      form.rules.map((r) => ({
        title: r.title,
        body: r.body,
        matchKey: r.matchKey,
        matchValue: r.matchValue,
        isFallback: r.isFallback,
        sortOrder: r.sortOrder,
      })),
    );

    return {
      leadId: lead.id,
      score: lead.score,
      temperature: lead.temperature,
      qualified: lead.qualified,
      eventId,
      diagnosis,
      threshold: form.qualificationThreshold,
      bands: {
        coldMax: form.scoreColdMax,
        warmMax: form.scoreWarmMax,
        hotMax: form.scoreHotMax,
      },
    };
  });

const bookSchema = z.object({
  slug: z.string().trim().min(1).default("leads"),
  leadId: z.string().uuid(),
  slot: z.string().trim().min(5).max(40),
  fbp: z.string().optional(),
  fbc: z.string().optional(),
  sourceUrl: z.string().url().optional().or(z.literal("")).optional(),
});

export const bookLeadSlotFn = createServerFn({ method: "POST" })
  .inputValidator((data) => bookSchema.parse(data))
  .handler(async ({ data }) => {
    const form = await getActiveForm(data.slug);
    if (!form.agendaEnabled) throw new Error("Agenda desabilitada.");

    const lead = await db.lead.findFirst({ where: { id: data.leadId, formId: form.id } });
    if (!lead) throw new Error("Lead não encontrado.");

    const bookedCount = await db.lead.count({
      where: {
        formId: form.id,
        slot: data.slot,
        status: "agendado",
        id: { not: lead.id },
      },
    });
    if (bookedCount >= form.agendaSlotsPerSlot) {
      throw new Error("Este horário acabou de esgotar. Escolha outro.");
    }

    const eventId = randomUUID();
    const updated = await db.lead.update({
      where: { id: lead.id },
      data: {
        slot: data.slot,
        status: "agendado",
        scheduledAt: new Date(),
        fbp: data.fbp ?? lead.fbp,
        fbc: data.fbc ?? lead.fbc,
        sourceUrl: data.sourceUrl || lead.sourceUrl,
        eventId,
      },
    });

    await recordLeadEvent(updated.id, "scheduled", { slot: data.slot, eventId });
    // Conversões de agenda também só para leads já qualificados por score
    if (updated.qualified) {
      await maybeSendCapi(updated, form.integrations, "Schedule", eventId);
      await maybeSendQualifiedWebhook(updated, form, form.integrations);
    }

    const waText = encodeURIComponent(
      `${form.whatsappMessage || "Quero agendar minha degustação"} — ${data.slot} — ${updated.name || ""}`,
    );
    const whatsappUrl = `https://wa.me/${form.whatsappDestination.replace(/\D/g, "")}?text=${waText}`;

    return {
      leadId: updated.id,
      slot: updated.slot,
      eventId,
      whatsappUrl,
    };
  });
