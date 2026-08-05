import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { requireAuth } from "@/integrations/auth/auth-middleware";
import { assertAdmin } from "@/lib/auth-session";
import {
  recordLeadEvent,
  serializeLeadForWebhook,
} from "@/lib/leads/service";
import { sendLeadWebhook } from "@/lib/leads/webhook";
import {
  LEAD_QUESTION_TYPES,
  type LeadQuestionTypeValue,
} from "@/lib/leads/question-types";

async function guardAdmin(context: { userId?: string }) {
  const userId = context.userId;
  if (!userId) throw new Error("Sessão inválida.");
  await assertAdmin(userId);
}

const slugSchema = z.object({ slug: z.string().trim().min(1).default("leads") });
const idSchema = z.object({ id: z.string().uuid() });

function leadRecord(lead: {
  id: string;
  formId: string;
  name: string | null;
  email: string | null;
  whatsapp: string | null;
  status: string;
  intent?: string;
  score: number;
  temperature?: string;
  qualified: boolean;
  answers: unknown;
  utm: unknown;
  slot: string | null;
  sourceUrl: string | null;
  notes: string | null;
  scheduledAt: Date | null;
  completedAt: Date | null;
  qualifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  events?: Array<{ id: string; type: string; payload: unknown; createdAt: Date }>;
}) {
  return {
    id: lead.id,
    form_id: lead.formId,
    name: lead.name,
    email: lead.email,
    whatsapp: lead.whatsapp,
    status: lead.status,
    intent: lead.intent ?? "evento",
    score: lead.score,
    temperature: lead.temperature ?? "frio",
    qualified: lead.qualified,
    answers: (lead.answers ?? {}) as Record<string, string | number | boolean | null>,
    utm: (lead.utm ?? {}) as Record<string, string | number | boolean | null>,
    slot: lead.slot,
    source_url: lead.sourceUrl,
    notes: lead.notes,
    scheduled_at: lead.scheduledAt?.toISOString() ?? null,
    completed_at: lead.completedAt?.toISOString() ?? null,
    qualified_at: lead.qualifiedAt?.toISOString() ?? null,
    created_at: lead.createdAt.toISOString(),
    updated_at: lead.updatedAt.toISOString(),
    events: lead.events?.map((e) => ({
      id: e.id,
      type: e.type,
      payload: (e.payload ?? {}) as Record<string, string | number | boolean | null>,
      created_at: e.createdAt.toISOString(),
    })),
  };
}

export const listLeadsFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((data) =>
    z
      .object({
        slug: z.string().optional(),
        status: z.enum(["parcial", "completo", "agendado", "descartado"]).optional(),
        intent: z.enum(["evento", "parceria", "trabalhe_conosco"]).optional(),
        qualified: z.enum(["true", "false", "all"]).optional(),
        q: z.string().optional(),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    await guardAdmin(context);
    const form = await db.leadForm.findFirst({
      where: { slug: data.slug || "leads" },
    });
    if (!form) return { leads: [] };

    const leads = await db.lead.findMany({
      where: {
        formId: form.id,
        ...(data.status ? { status: data.status } : {}),
        ...(data.intent ? { intent: data.intent } : {}),
        ...(data.qualified === "true"
          ? { qualified: true }
          : data.qualified === "false"
            ? { qualified: false }
            : {}),
        ...(data.q
          ? {
              OR: [
                { name: { contains: data.q, mode: "insensitive" } },
                { email: { contains: data.q, mode: "insensitive" } },
                { whatsapp: { contains: data.q.replace(/\D/g, "") } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    return { leads: leads.map(leadRecord) };
  });

export const getLeadFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((data) => idSchema.parse(data))
  .handler(async ({ data, context }) => {
    await guardAdmin(context);
    const lead = await db.lead.findUnique({
      where: { id: data.id },
      include: { events: { orderBy: { createdAt: "desc" }, take: 50 } },
    });
    if (!lead) throw new Error("Lead não encontrado.");
    return { lead: leadRecord(lead) };
  });

export const updateLeadFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["parcial", "completo", "agendado", "descartado"]).optional(),
        notes: z.string().max(5000).optional(),
        qualified: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await guardAdmin(context);
    const lead = await db.lead.update({
      where: { id: data.id },
      data: {
        ...(data.status ? { status: data.status } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        ...(data.qualified !== undefined
          ? {
              qualified: data.qualified,
              qualifiedAt: data.qualified ? new Date() : null,
            }
          : {}),
      },
    });
    return { lead: leadRecord(lead) };
  });

export const deleteLeadsFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) =>
    z.object({ ids: z.array(z.string().uuid()).min(1) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await guardAdmin(context);
    const result = await db.lead.deleteMany({ where: { id: { in: data.ids } } });
    return { ok: true as const, count: result.count };
  });

export const exportLeadsCsvFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((data) => slugSchema.parse(data ?? { slug: "leads" }))
  .handler(async ({ data, context }) => {
    await guardAdmin(context);
    const form = await db.leadForm.findFirst({ where: { slug: data.slug } });
    if (!form) return { csv: "id\n" };

    const leads = await db.lead.findMany({
      where: { formId: form.id },
      orderBy: { createdAt: "desc" },
    });

    const headers = [
      "id",
      "name",
      "email",
      "whatsapp",
      "status",
      "intent",
      "score",
      "qualified",
      "slot",
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "gclid",
      "fbclid",
      "source_url",
      "created_at",
    ];
    const lines = [headers.join(",")];
    for (const lead of leads) {
      const utm = (lead.utm as Record<string, string>) || {};
      const row = [
        lead.id,
        lead.name,
        lead.email,
        lead.whatsapp,
        lead.status,
        lead.intent,
        String(lead.score),
        String(lead.qualified),
        lead.slot,
        utm.utm_source,
        utm.utm_medium,
        utm.utm_campaign,
        utm.utm_term,
        utm.utm_content,
        utm.gclid,
        utm.fbclid,
        lead.sourceUrl,
        lead.createdAt.toISOString(),
      ].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`);
      lines.push(row.join(","));
    }
    return { csv: lines.join("\n") };
  });

export const getAdminLeadFormFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((data) => slugSchema.parse(data ?? { slug: "leads" }))
  .handler(async ({ data, context }) => {
    await guardAdmin(context);
    const form = await db.leadForm.findFirst({
      where: { slug: data.slug },
      include: {
        questions: {
          orderBy: { sortOrder: "asc" },
          include: { options: { orderBy: { sortOrder: "asc" } } },
        },
        rules: { orderBy: { sortOrder: "asc" } },
        integrations: true,
      },
    });
    if (!form) throw new Error("Formulário não encontrado.");

    let integrations = form.integrations;
    if (!integrations) {
      integrations = await db.leadIntegrationSettings.create({
        data: {
          formId: form.id,
          gtmId: process.env.LEAD_GTM_ID || null,
          metaPixelId: process.env.META_PIXEL_ID || null,
          metaAccessToken: process.env.META_CAPI_TOKEN || null,
          webhookUrl: process.env.LEAD_WEBHOOK_URL || null,
          webhookSecret: process.env.LEAD_WEBHOOK_SECRET || null,
        },
      });
    }

    return {
      form: {
        id: form.id,
        slug: form.slug,
        title: form.title,
        brand_name: form.brandName,
        agent_name: form.agentName,
        agent_title: form.agentTitle,
        agent_avatar_url: form.agentAvatarUrl,
        primary_color: form.primaryColor,
        wallpaper_url: form.wallpaperUrl,
        wallpaper_dark_url: form.wallpaperDarkUrl,
        header_subtitle: form.headerSubtitle,
        whatsapp_destination: form.whatsappDestination,
        whatsapp_message: form.whatsappMessage,
        privacy_url: form.privacyUrl,
        terms_url: form.termsUrl,
        qualification_threshold: form.qualificationThreshold,
        score_cold_max: form.scoreColdMax,
        score_warm_max: form.scoreWarmMax,
        score_hot_max: form.scoreHotMax,
        bot_delay_ms: form.botDelayMs,
        seo_title: form.seoTitle,
        seo_description: form.seoDescription,
        page_bg_light: form.pageBgLight,
        page_bg_dark: form.pageBgDark,
        agenda_enabled: form.agendaEnabled,
        agenda_weekdays: form.agendaWeekdays,
        agenda_times: form.agendaTimes,
        agenda_days_ahead: form.agendaDaysAhead,
        agenda_lead_hours: form.agendaLeadHours,
        agenda_slots_per_slot: form.agendaSlotsPerSlot,
        active: form.active,
        questions: form.questions.map((q) => ({
          id: q.id,
          key: q.key,
          type: q.type,
          label: q.label,
          prompt: q.prompt,
          bot_messages: q.botMessages,
          placeholder: q.placeholder,
          redirect_delay_sec: q.redirectDelaySec,
          redirect_button_label: q.redirectButtonLabel,
          next_key: q.nextKey || "",
          sort_order: q.sortOrder,
          required: q.required,
          score_bonus: q.scoreBonus,
          active: q.active,
          options: q.options.map((o) => ({
            id: o.id,
            label: o.label,
            score_points: o.scorePoints,
            next_key: o.nextKey || "",
            sort_order: o.sortOrder,
            active: o.active,
          })),
        })),
        rules: form.rules.map((r) => ({
          id: r.id,
          title: r.title,
          body: r.body,
          match_key: r.matchKey,
          match_value: r.matchValue,
          sort_order: r.sortOrder,
          is_fallback: r.isFallback,
          active: r.active,
        })),
        integrations: {
          gtm_id: integrations.gtmId,
          ga_measurement_id: integrations.gaMeasurementId,
          google_ads_id: integrations.googleAdsId,
          google_ads_conversion_label: integrations.googleAdsConversionLabel,
          meta_pixel_id: integrations.metaPixelId,
          meta_access_token: integrations.metaAccessToken ? "••••••••" : null,
          has_meta_token: Boolean(integrations.metaAccessToken),
          meta_test_event_code: integrations.metaTestEventCode,
          webhook_url: integrations.webhookUrl,
          webhook_secret: integrations.webhookSecret ? "••••••••" : null,
          has_webhook_secret: Boolean(integrations.webhookSecret),
          conversion_min_temperature: integrations.conversionMinTemperature,
          pixel_enabled: integrations.pixelEnabled,
          gtm_enabled: integrations.gtmEnabled,
          capi_enabled: integrations.capiEnabled,
          webhook_enabled: integrations.webhookEnabled,
        },
      },
    };
  });

export const updateLeadFormFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid(),
        title: z.string().trim().min(2).max(120).optional(),
        brand_name: z.string().trim().min(2).max(120).optional(),
        agent_name: z.string().trim().min(2).max(80).optional(),
        agent_title: z.string().trim().max(120).nullable().optional(),
        agent_avatar_url: z.string().trim().max(5000).nullable().optional(),
        primary_color: z
          .string()
          .trim()
          .regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, "Cor inválida")
          .optional(),
        wallpaper_url: z.string().trim().max(5000).nullable().optional(),
        wallpaper_dark_url: z.string().trim().max(5000).nullable().optional(),
        header_subtitle: z.string().trim().max(160).nullable().optional(),
        whatsapp_destination: z.string().trim().min(10).max(30).optional(),
        whatsapp_message: z.string().trim().max(2000).nullable().optional(),
        privacy_url: z.string().trim().max(500).nullable().optional(),
        terms_url: z.string().trim().max(500).nullable().optional(),
        qualification_threshold: z.number().int().min(0).max(200).optional(),
        score_cold_max: z.number().int().min(0).max(200).optional(),
        score_warm_max: z.number().int().min(0).max(200).optional(),
        score_hot_max: z.number().int().min(0).max(200).optional(),
        bot_delay_ms: z.number().int().min(0).max(5000).optional(),
        seo_title: z.string().trim().max(120).nullable().optional(),
        seo_description: z.string().trim().max(320).nullable().optional(),
        page_bg_light: z
          .string()
          .trim()
          .regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/)
          .nullable()
          .optional(),
        page_bg_dark: z
          .string()
          .trim()
          .regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/)
          .nullable()
          .optional(),
        agenda_enabled: z.boolean().optional(),
        agenda_weekdays: z.array(z.number().int().min(0).max(6)).optional(),
        agenda_times: z.array(z.string().regex(/^\d{2}:\d{2}$/)).optional(),
        agenda_days_ahead: z.number().int().min(1).max(90).optional(),
        agenda_lead_hours: z.number().int().min(0).max(72).optional(),
        agenda_slots_per_slot: z.number().int().min(1).max(50).optional(),
        active: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await guardAdmin(context);
    const { id, ...rest } = data;
    await db.leadForm.update({
      where: { id },
      data: {
        ...(rest.title !== undefined ? { title: rest.title } : {}),
        ...(rest.brand_name !== undefined ? { brandName: rest.brand_name } : {}),
        ...(rest.agent_name !== undefined ? { agentName: rest.agent_name } : {}),
        ...(rest.agent_title !== undefined ? { agentTitle: rest.agent_title } : {}),
        ...(rest.agent_avatar_url !== undefined ? { agentAvatarUrl: rest.agent_avatar_url } : {}),
        ...(rest.primary_color !== undefined ? { primaryColor: rest.primary_color } : {}),
        ...(rest.wallpaper_url !== undefined ? { wallpaperUrl: rest.wallpaper_url } : {}),
        ...(rest.wallpaper_dark_url !== undefined ? { wallpaperDarkUrl: rest.wallpaper_dark_url } : {}),
        ...(rest.header_subtitle !== undefined ? { headerSubtitle: rest.header_subtitle } : {}),
        ...(rest.whatsapp_destination !== undefined
          ? { whatsappDestination: rest.whatsapp_destination }
          : {}),
        ...(rest.whatsapp_message !== undefined ? { whatsappMessage: rest.whatsapp_message } : {}),
        ...(rest.privacy_url !== undefined ? { privacyUrl: rest.privacy_url } : {}),
        ...(rest.terms_url !== undefined ? { termsUrl: rest.terms_url } : {}),
        ...(rest.qualification_threshold !== undefined
          ? { qualificationThreshold: rest.qualification_threshold }
          : {}),
        ...(rest.score_cold_max !== undefined ? { scoreColdMax: rest.score_cold_max } : {}),
        ...(rest.score_warm_max !== undefined
          ? {
              scoreWarmMax: rest.score_warm_max,
              qualificationThreshold: rest.score_warm_max + 1,
            }
          : {}),
        ...(rest.score_hot_max !== undefined ? { scoreHotMax: rest.score_hot_max } : {}),
        ...(rest.bot_delay_ms !== undefined ? { botDelayMs: rest.bot_delay_ms } : {}),
        ...(rest.seo_title !== undefined ? { seoTitle: rest.seo_title } : {}),
        ...(rest.seo_description !== undefined ? { seoDescription: rest.seo_description } : {}),
        ...(rest.page_bg_light !== undefined ? { pageBgLight: rest.page_bg_light } : {}),
        ...(rest.page_bg_dark !== undefined ? { pageBgDark: rest.page_bg_dark } : {}),
        ...(rest.agenda_enabled !== undefined ? { agendaEnabled: rest.agenda_enabled } : {}),
        ...(rest.agenda_weekdays !== undefined ? { agendaWeekdays: rest.agenda_weekdays } : {}),
        ...(rest.agenda_times !== undefined ? { agendaTimes: rest.agenda_times } : {}),
        ...(rest.agenda_days_ahead !== undefined ? { agendaDaysAhead: rest.agenda_days_ahead } : {}),
        ...(rest.agenda_lead_hours !== undefined ? { agendaLeadHours: rest.agenda_lead_hours } : {}),
        ...(rest.agenda_slots_per_slot !== undefined
          ? { agendaSlotsPerSlot: rest.agenda_slots_per_slot }
          : {}),
        ...(rest.active !== undefined ? { active: rest.active } : {}),
      },
    });
    return { ok: true as const };
  });

export const saveLeadQuestionFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid().optional(),
        form_id: z.string().uuid(),
        key: z.string().trim().min(1).max(60),
        type: z.enum(LEAD_QUESTION_TYPES as unknown as [string, ...string[]]),
        label: z.string().trim().max(120).nullable().optional(),
        prompt: z.string().trim().max(2000).nullable().optional(),
        bot_messages: z.array(z.string().max(4000)).optional(),
        placeholder: z.string().trim().max(4000).nullable().optional(),
        redirect_delay_sec: z.number().int().min(0).max(120).optional(),
        redirect_button_label: z.string().trim().max(60).nullable().optional(),
        next_key: z.string().trim().max(60).nullable().optional(),
        sort_order: z.number().int().min(0).default(0),
        required: z.boolean().default(true),
        score_bonus: z.number().int().min(0).max(100).default(0),
        active: z.boolean().default(true),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await guardAdmin(context);
    const fields = {
      key: data.key,
      type: data.type as LeadQuestionTypeValue,
      label: data.label ?? null,
      prompt: data.prompt ?? null,
      botMessages: data.bot_messages ?? [],
      placeholder: data.placeholder ?? null,
      redirectDelaySec: data.redirect_delay_sec ?? 3,
      redirectButtonLabel: data.redirect_button_label?.trim() || null,
      nextKey: data.next_key?.trim() || null,
      sortOrder: data.sort_order,
      required: data.required,
      scoreBonus: data.score_bonus,
      active: data.active,
    };
    if (data.id) {
      // Prisma UpdateInput rejeita FK escalar `formId` — só campos + relação `form`.
      await db.leadFormQuestion.update({ where: { id: data.id }, data: fields });
    } else {
      await db.leadFormQuestion.create({
        data: { ...fields, form: { connect: { id: data.form_id } } },
      });
    }
    return { ok: true as const };
  });

export const deleteLeadQuestionFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => idSchema.parse(data))
  .handler(async ({ data, context }) => {
    await guardAdmin(context);
    await db.leadFormQuestion.delete({ where: { id: data.id } });
    return { ok: true as const };
  });

export const saveLeadOptionFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid().optional(),
        question_id: z.string().uuid(),
        label: z.string().trim().min(1).max(200),
        score_points: z.number().int().min(0).max(200).default(0),
        next_key: z.string().trim().max(60).nullable().optional(),
        sort_order: z.number().int().min(0).default(0),
        active: z.boolean().default(true),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await guardAdmin(context);
    const fields = {
      label: data.label,
      scorePoints: data.score_points,
      nextKey: data.next_key?.trim() || null,
      sortOrder: data.sort_order,
      active: data.active,
    };
    if (data.id) {
      await db.leadFormOption.update({ where: { id: data.id }, data: fields });
    } else {
      await db.leadFormOption.create({
        data: { ...fields, question: { connect: { id: data.question_id } } },
      });
    }
    return { ok: true as const };
  });

export const deleteLeadOptionFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => idSchema.parse(data))
  .handler(async ({ data, context }) => {
    await guardAdmin(context);
    await db.leadFormOption.delete({ where: { id: data.id } });
    return { ok: true as const };
  });

export const reorderLeadQuestionsFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) =>
    z
      .object({
        form_id: z.string().uuid(),
        ordered_ids: z.array(z.string().uuid()).min(1),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await guardAdmin(context);
    await db.$transaction(
      data.ordered_ids.map((id, index) =>
        db.leadFormQuestion.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );
    return { ok: true as const };
  });

export const saveLeadRuleFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid().optional(),
        form_id: z.string().uuid(),
        title: z.string().trim().min(2).max(200),
        body: z.string().trim().min(2).max(4000),
        match_key: z.string().trim().max(60).nullable().optional(),
        match_value: z.string().trim().max(200).nullable().optional(),
        sort_order: z.number().int().min(0).default(0),
        is_fallback: z.boolean().default(false),
        active: z.boolean().default(true),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await guardAdmin(context);
    const fields = {
      title: data.title,
      body: data.body,
      matchKey: data.match_key ?? null,
      matchValue: data.match_value ?? null,
      sortOrder: data.sort_order,
      isFallback: data.is_fallback,
      active: data.active,
    };
    if (data.id) {
      await db.leadFormRule.update({ where: { id: data.id }, data: fields });
    } else {
      await db.leadFormRule.create({
        data: { ...fields, form: { connect: { id: data.form_id } } },
      });
    }
    return { ok: true as const };
  });

export const deleteLeadRuleFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => idSchema.parse(data))
  .handler(async ({ data, context }) => {
    await guardAdmin(context);
    await db.leadFormRule.delete({ where: { id: data.id } });
    return { ok: true as const };
  });

export const updateLeadIntegrationsFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) =>
    z
      .object({
        form_id: z.string().uuid(),
        gtm_id: z.string().trim().max(40).nullable().optional(),
        ga_measurement_id: z.string().trim().max(40).nullable().optional(),
        google_ads_id: z.string().trim().max(40).nullable().optional(),
        google_ads_conversion_label: z.string().trim().max(80).nullable().optional(),
        meta_pixel_id: z.string().trim().max(40).nullable().optional(),
        meta_access_token: z.string().trim().max(500).nullable().optional(),
        meta_test_event_code: z.string().trim().max(80).nullable().optional(),
        webhook_url: z.string().trim().max(500).nullable().optional(),
        webhook_secret: z.string().trim().max(200).nullable().optional(),
        conversion_min_temperature: z
          .enum(["any", "morno", "quente", "muito_quente"])
          .optional(),
        pixel_enabled: z.boolean().optional(),
        gtm_enabled: z.boolean().optional(),
        capi_enabled: z.boolean().optional(),
        webhook_enabled: z.boolean().optional(),
        clear_meta_token: z.boolean().optional(),
        clear_webhook_secret: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await guardAdmin(context);
    const existing = await db.leadIntegrationSettings.findUnique({
      where: { formId: data.form_id },
    });

    const tokenUpdate =
      data.clear_meta_token
        ? { metaAccessToken: null }
        : data.meta_access_token && data.meta_access_token !== "••••••••"
          ? { metaAccessToken: data.meta_access_token }
          : {};
    const secretUpdate =
      data.clear_webhook_secret
        ? { webhookSecret: null }
        : data.webhook_secret && data.webhook_secret !== "••••••••"
          ? { webhookSecret: data.webhook_secret }
          : {};

    const payload = {
      gtmId: data.gtm_id?.trim() || null,
      gaMeasurementId: data.ga_measurement_id?.trim() || null,
      googleAdsId: data.google_ads_id?.trim() || null,
      googleAdsConversionLabel: data.google_ads_conversion_label?.trim() || null,
      metaPixelId: data.meta_pixel_id?.trim() || null,
      metaTestEventCode: data.meta_test_event_code?.trim() || null,
      webhookUrl: data.webhook_url?.trim() || null,
      ...(data.conversion_min_temperature !== undefined
        ? { conversionMinTemperature: data.conversion_min_temperature }
        : {}),
      pixelEnabled: data.pixel_enabled ?? true,
      gtmEnabled: data.gtm_enabled ?? true,
      capiEnabled: data.capi_enabled ?? true,
      webhookEnabled: data.webhook_enabled ?? true,
      ...tokenUpdate,
      ...secretUpdate,
    };

    if (existing) {
      await db.leadIntegrationSettings.update({
        where: { formId: data.form_id },
        data: payload,
      });
    } else {
      await db.leadIntegrationSettings.create({
        data: { formId: data.form_id, ...payload },
      });
    }
    return { ok: true as const };
  });

export const resendLeadWebhookFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => idSchema.parse(data))
  .handler(async ({ data, context }) => {
    await guardAdmin(context);
    const lead = await db.lead.findUnique({
      where: { id: data.id },
      include: { form: { include: { integrations: true } } },
    });
    if (!lead) throw new Error("Lead não encontrado.");
    if (!lead.qualified) throw new Error("Lead não está qualificado.");

    const settings = lead.form.integrations;
    const url = settings?.webhookUrl || process.env.LEAD_WEBHOOK_URL;
    if (!url) throw new Error("Webhook URL não configurada.");

    const result = await sendLeadWebhook({
      url,
      secret: settings?.webhookSecret || process.env.LEAD_WEBHOOK_SECRET,
      payload: serializeLeadForWebhook(lead, lead.form.slug),
    });
    await recordLeadEvent(lead.id, result.ok ? "webhook_sent" : "webhook_failed", {
      status: result.status,
      detail: result.detail,
      manual: true,
    });
    if (!result.ok) throw new Error(result.detail || "Falha no webhook.");
    return { ok: true as const };
  });

export const testLeadWebhookFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) =>
    z
      .object({
        form_id: z.string().uuid(),
        webhook_url: z.string().url().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await guardAdmin(context);
    const form = await db.leadForm.findUnique({
      where: { id: data.form_id },
      include: { integrations: true },
    });
    if (!form) throw new Error("Formulário não encontrado.");
    const url =
      data.webhook_url || form.integrations?.webhookUrl || process.env.LEAD_WEBHOOK_URL;
    if (!url) throw new Error("Informe a URL do webhook.");

    const result = await sendLeadWebhook({
      url,
      secret: form.integrations?.webhookSecret || process.env.LEAD_WEBHOOK_SECRET,
      payload: {
        id: "00000000-0000-0000-0000-000000000000",
        formSlug: form.slug,
        name: "Lead Teste",
        email: "teste@espacopallazium.com.br",
        whatsapp: "5511999999999",
        status: "completo",
        score: 80,
        qualified: true,
        answers: { tipoEvento: "Casamento", investimento: "acima de R$ 40 mil" },
        utm: { utm_source: "test" },
        slot: null,
        sourceUrl: null,
        scheduledAt: null,
        completedAt: new Date().toISOString(),
        qualifiedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    });
    if (!result.ok) throw new Error(result.detail || `HTTP ${result.status}`);
    return { ok: true as const, detail: result.detail };
  });

export const testMetaCapiFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) =>
    z
      .object({
        form_id: z.string().uuid(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await guardAdmin(context);
    const form = await db.leadForm.findUnique({
      where: { id: data.form_id },
      include: { integrations: true },
    });
    if (!form) throw new Error("Formulário não encontrado.");
    const settings = form.integrations;
    const pixelId = settings?.metaPixelId || process.env.META_PIXEL_ID;
    const accessToken = settings?.metaAccessToken || process.env.META_CAPI_TOKEN;
    if (!pixelId) throw new Error("Informe o Meta Pixel ID.");
    if (!accessToken) throw new Error("Informe o Meta CAPI Access Token.");

    const { sendMetaCapiEvent } = await import("@/lib/leads/tracking.server");
    const eventId = randomUUID();
    const result = await sendMetaCapiEvent({
      eventName: "Lead",
      eventId,
      eventSourceUrl: "https://app.espacopallazium.com.br/leads",
      pixelId,
      accessToken,
      testEventCode: settings?.metaTestEventCode || process.env.META_TEST_EVENT_CODE || null,
      user: {
        email: "teste@espacopallazium.com.br",
        phone: "5511999999999",
      },
      customData: { lead_id: "test", score: 80, qualified: true, status: "completo" },
    });
    if (!result.ok) throw new Error(result.detail || "Falha no CAPI.");
    return { ok: true as const, eventId, detail: result.detail };
  });

export const getLeadIntegrationHealthFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((data) => slugSchema.parse(data ?? { slug: "leads" }))
  .handler(async ({ data, context }) => {
    await guardAdmin(context);
    const form = await db.leadForm.findFirst({
      where: { slug: data.slug },
      include: { integrations: true },
    });
    if (!form) throw new Error("Formulário não encontrado.");

    const events = await db.leadEvent.findMany({
      where: {
        lead: { formId: form.id },
        type: { in: ["webhook_sent", "webhook_failed", "capi_sent", "capi_failed"] },
      },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { lead: { select: { id: true, name: true, email: true } } },
    });

    const i = form.integrations;
    return {
      status: {
        gtm: Boolean(i?.gtmEnabled && (i.gtmId || process.env.LEAD_GTM_ID)),
        pixel: Boolean(i?.pixelEnabled && (i.metaPixelId || process.env.META_PIXEL_ID)),
        capi: Boolean(
          i?.capiEnabled &&
            (i.metaPixelId || process.env.META_PIXEL_ID) &&
            (i.metaAccessToken || process.env.META_CAPI_TOKEN),
        ),
        webhook: Boolean(i?.webhookEnabled && (i.webhookUrl || process.env.LEAD_WEBHOOK_URL)),
      },
      recent_events: events.map((e) => ({
        id: e.id,
        type: e.type,
        lead_name: e.lead.name,
        lead_email: e.lead.email,
        created_at: e.createdAt.toISOString(),
        payload: e.payload as Record<string, string | number | boolean | null>,
      })),
    };
  });
