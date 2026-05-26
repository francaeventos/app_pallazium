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
  };
}

const eventInclude = {
  client: { select: { fullName: true, email: true, whatsapp: true } },
} as const;

export const listEventsFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const [events, clients, financialOptions] = await Promise.all([
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
    ]);

    return {
      events: events.map((e) => mapEventRow(e, e.client)),
      clients: clients.map(mapClientBrief),
      financial_status_options: financialOptions.map(mapFinancialStatusOption),
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
        include: eventInclude,
      });

      const template = checklistTemplateForEvent(data.event_type);
      const items = template.map((item, i) => ({
        eventId: created.id,
        title: item.title,
        description: item.description ?? null,
        sortOrder: i,
        priority: item.priority as PriorityLevel,
      }));
      await tx.checklistItem.createMany({ data: items });

      return created;
    });

    return {
      event: mapEventRow(event, event.client),
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
    const event = await db.event.update({
      where: { id },
      data: toEventData(payload),
      include: eventInclude,
    });
    return mapEventRow(event, event.client);
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
    return mapEventRow(event, event.client);
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
