import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/integrations/auth/auth-middleware";
import { assertAdmin } from "@/lib/auth-session";
import { mapChecklistItemRow, mapEventRow, parseDateInput } from "@/lib/admin-mappers";
import { BRIDE_CHECKLIST } from "@/lib/checklist-templates";
import { db } from "@/lib/db";
import type { ChecklistStatus, PriorityLevel } from "@/generated/prisma/enums";

const checklistStatusSchema = z.enum(["pendente", "em_analise", "concluido"]);
const prioritySchema = z.enum(["baixa", "media", "alta"]);

export const listChecklistEventsFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const events = await db.event.findMany({
      include: { client: { select: { fullName: true } } },
      orderBy: { eventDate: "asc" },
    });
    return events.map((e) => ({
      id: e.id,
      event_type: e.eventType,
      event_date: e.eventDate?.toISOString().slice(0, 10) ?? null,
      clients: e.client ? { full_name: e.client.fullName } : null,
    }));
  });

export const getEventChecklistFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((data) => z.object({ event_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const [event, items] = await Promise.all([
      db.event.findUnique({
        where: { id: data.event_id },
        include: { client: { select: { fullName: true } } },
      }),
      db.checklistItem.findMany({
        where: { eventId: data.event_id },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    if (!event) throw new Error("Evento não encontrado.");

    return {
      event: mapEventRow(event, event.client ? { fullName: event.client.fullName, email: "" } : null),
      items: items.map(mapChecklistItemRow),
    };
  });

const checklistItemPatchSchema = z.object({
  title: z.string().trim().min(1).optional(),
  description: z.string().nullable().optional(),
  status: checklistStatusSchema.optional(),
  priority: prioritySchema.optional(),
  due_date: z.string().nullable().optional(),
  attachment_url: z.string().nullable().optional(),
  client_notes: z.string().nullable().optional(),
  internal_notes: z.string().nullable().optional(),
  sort_order: z.number().int().optional(),
});

export const updateChecklistItemFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) =>
    z.object({ id: z.string().uuid() }).merge(checklistItemPatchSchema).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { id, ...patch } = data;
    const row = await db.checklistItem.update({
      where: { id },
      data: {
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.description !== undefined ? { description: patch.description } : {}),
        ...(patch.status !== undefined ? { status: patch.status as ChecklistStatus } : {}),
        ...(patch.priority !== undefined ? { priority: patch.priority as PriorityLevel } : {}),
        ...(patch.due_date !== undefined
          ? { dueDate: parseDateInput(patch.due_date) }
          : {}),
        ...(patch.attachment_url !== undefined ? { attachmentUrl: patch.attachment_url } : {}),
        ...(patch.client_notes !== undefined ? { clientNotes: patch.client_notes } : {}),
        ...(patch.internal_notes !== undefined ? { internalNotes: patch.internal_notes } : {}),
        ...(patch.sort_order !== undefined ? { sortOrder: patch.sort_order } : {}),
      },
    });
    return mapChecklistItemRow(row);
  });

export const addChecklistItemFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) =>
    z
      .object({
        event_id: z.string().uuid(),
        title: z.string().trim().min(1),
        description: z.string().nullable().optional(),
        priority: prioritySchema.optional(),
        due_date: z.string().nullable().optional(),
        attachment_url: z.string().nullable().optional(),
        client_notes: z.string().nullable().optional(),
        internal_notes: z.string().nullable().optional(),
        sort_order: z.number().int().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const sortOrder =
      data.sort_order ??
      (await db.checklistItem.count({ where: { eventId: data.event_id } }));

    const row = await db.checklistItem.create({
      data: {
        eventId: data.event_id,
        title: data.title,
        description: data.description ?? null,
        priority: (data.priority ?? "media") as PriorityLevel,
        dueDate: parseDateInput(data.due_date ?? null),
        attachmentUrl: data.attachment_url ?? null,
        clientNotes: data.client_notes ?? null,
        internalNotes: data.internal_notes ?? null,
        sortOrder,
      },
    });
    return mapChecklistItemRow(row);
  });

export const applyBrideChecklistFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => z.object({ event_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const existing = await db.checklistItem.findMany({
      where: { eventId: data.event_id },
      select: { title: true, sortOrder: true },
    });

    const existingTitles = new Set(existing.map((item) => item.title.toLowerCase()));
    const missingItems = BRIDE_CHECKLIST.filter(
      (templateItem) => !existingTitles.has(templateItem.title.toLowerCase()),
    );

    if (missingItems.length === 0) {
      return { applied: 0 as const, message: "Checklist da noiva já aplicado neste evento." };
    }

    const startOrder = existing.reduce((max, item) => Math.max(max, item.sortOrder), -1) + 1;
    await db.checklistItem.createMany({
      data: missingItems.map((item, index) => ({
        eventId: data.event_id,
        title: item.title,
        description: item.description ?? null,
        priority: item.priority as PriorityLevel,
        sortOrder: startOrder + index,
      })),
    });

    return { applied: missingItems.length as number };
  });

export const deleteChecklistItemFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await db.checklistItem.delete({ where: { id: data.id } });
    return { ok: true as const };
  });
