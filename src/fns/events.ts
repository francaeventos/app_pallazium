import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/integrations/auth/auth-middleware";
import { assertAdmin } from "@/lib/auth-session";
import {
  mapClientBrief,
  mapEventRow,
  mapFinancialStatusOption,
  parseDateInput,
  parseTimeInput,
} from "@/lib/admin-mappers";
import { BRIDE_CHECKLIST, checklistTemplateForEvent } from "@/lib/checklist-templates";
import { db } from "@/lib/db";
import type { EventStatus, PriorityLevel } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";

const eventStatusSchema = z.enum([
  "novo",
  "em_organizacao",
  "proximo",
  "concluido",
  "cancelado",
]);

const eventPayloadSchema = z.object({
  client_id: z.string().uuid(),
  event_type: z.string().trim().min(1),
  event_date: z.string().nullable().optional(),
  start_time: z.string().nullable().optional(),
  end_time: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  estimated_guests: z.number().int().nullable().optional(),
  contracted_value: z.number().nullable().optional(),
  financial_status: z.string().nullable().optional(),
  status: eventStatusSchema.optional(),
  client_notes: z.string().nullable().optional(),
  internal_notes: z.string().nullable().optional(),
  menu_id: z.string().uuid().nullable().optional(),
  upgrade_ids: z.array(z.string().uuid()).optional(),
});

function toEventData(data: z.infer<typeof eventPayloadSchema>) {
  return {
    clientId: data.client_id,
    eventType: data.event_type,
    eventDate: parseDateInput(data.event_date ?? null),
    startTime: parseTimeInput(data.start_time ?? null),
    endTime: parseTimeInput(data.end_time ?? null),
    location: data.location ?? null,
    estimatedGuests: data.estimated_guests ?? null,
    contractedValue:
      data.contracted_value != null ? new Prisma.Decimal(data.contracted_value) : null,
    financialStatus: data.financial_status ?? null,
    status: (data.status ?? "novo") as EventStatus,
    clientNotes: data.client_notes ?? null,
    internalNotes: data.internal_notes ?? null,
    menuId: data.menu_id ?? null,
  };
}

async function syncEventUpgrades(tx: Prisma.TransactionClient, eventId: string, upgradeIds: string[]) {
  await tx.eventUpgrade.deleteMany({
    where: { eventId, upgradeId: { notIn: upgradeIds } },
  });
  if (upgradeIds.length > 0) {
    await tx.eventUpgrade.createMany({
      data: upgradeIds.map((upgradeId) => ({ eventId, upgradeId })),
      skipDuplicates: true,
    });
  }
}

const eventInclude = {
  client: { select: { fullName: true, email: true, whatsapp: true } },
  menu: { select: { id: true, name: true, category: true } },
  eventUpgrades: { select: { upgradeId: true } },
} as const;

type EventWithRelations = Prisma.EventGetPayload<{ include: typeof eventInclude }>;

function mapEventWithRelations(event: EventWithRelations) {
  return mapEventRow(
    event,
    event.client,
    event.menu,
    event.eventUpgrades.map((u) => u.upgradeId),
  );
}

export const listEventsFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const [events, clients, financialOptions, menus, upgrades] = await Promise.all([
      db.event.findMany({
        include: eventInclude,
        orderBy: { eventDate: "asc" },
      }),
      db.client.findMany({
        select: { id: true, fullName: true },
        orderBy: { fullName: "asc" },
      }),
      db.financialStatusOption.findMany({
        orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
      }),
      db.menu.findMany({
        select: { id: true, name: true, category: true },
        orderBy: { name: "asc" },
      }),
      db.upgrade.findMany({
        select: { id: true, name: true, category: true, priceText: true },
        orderBy: { name: "asc" },
      }),
    ]);

    return {
      events: events.map(mapEventWithRelations),
      clients: clients.map(mapClientBrief),
      financial_status_options: financialOptions.map(mapFinancialStatusOption),
      menus,
      upgrades: upgrades.map((u) => ({
        id: u.id,
        name: u.name,
        category: u.category,
        price_text: u.priceText,
      })),
    };
  });

export const createEventFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => eventPayloadSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const event = await db.$transaction(async (tx) => {
      const created = await tx.event.create({
        data: toEventData(data),
      });

      const upgradeIds = data.upgrade_ids ?? [];
      if (upgradeIds.length > 0) {
        await syncEventUpgrades(tx, created.id, upgradeIds);
      }

      const template = checklistTemplateForEvent(data.event_type);
      const items = template.map((item, i) => ({
        eventId: created.id,
        title: item.title,
        description: item.description ?? null,
        sortOrder: i,
        priority: item.priority as PriorityLevel,
      }));
      await tx.checklistItem.createMany({ data: items });

      return tx.event.findUniqueOrThrow({ where: { id: created.id }, include: eventInclude });
    });

    return {
      event: mapEventWithRelations(event),
      checklist_template: checklistTemplateForEvent(data.event_type),
      is_bride_checklist: checklistTemplateForEvent(data.event_type) === BRIDE_CHECKLIST,
    };
  });

export const updateEventFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) =>
    z.object({ id: z.string().uuid() }).merge(eventPayloadSchema).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { id, ...payload } = data;
    const event = await db.$transaction(async (tx) => {
      await tx.event.update({
        where: { id },
        data: toEventData(payload),
      });
      if (payload.upgrade_ids) {
        await syncEventUpgrades(tx, id, payload.upgrade_ids);
      }
      return tx.event.findUniqueOrThrow({ where: { id }, include: eventInclude });
    });
    return mapEventWithRelations(event);
  });

export const updateEventStatusFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) =>
    z.object({ id: z.string().uuid(), status: eventStatusSchema }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const event = await db.event.update({
      where: { id: data.id },
      data: { status: data.status as EventStatus },
      include: eventInclude,
    });
    return mapEventWithRelations(event);
  });

export const deleteEventFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await db.event.delete({ where: { id: data.id } });
    return { ok: true as const };
  });

export const addFinancialStatusOptionFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => z.object({ label: z.string().trim().min(1) }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const count = await db.financialStatusOption.count();
    const row = await db.financialStatusOption.create({
      data: { label: data.label, sortOrder: count },
    });
    return mapFinancialStatusOption(row);
  });

export const updateFinancialStatusOptionFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) =>
    z.object({ id: z.string().uuid(), label: z.string().trim().min(1) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const row = await db.financialStatusOption.update({
      where: { id: data.id },
      data: { label: data.label },
    });
    return mapFinancialStatusOption(row);
  });

export const deleteFinancialStatusOptionFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await db.financialStatusOption.delete({ where: { id: data.id } });
    return { ok: true as const };
  });
