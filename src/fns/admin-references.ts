import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/integrations/auth/auth-middleware";
import { assertAdmin } from "@/lib/auth-session";
import { eventOptionRecord, eventReferenceRecord } from "@/lib/admin-records";

async function guardAdmin(context: { userId?: string }) {
  const userId = context.userId;
  if (!userId) throw new Error("Sessão inválida.");
  await assertAdmin(userId);
}

const idSchema = z.object({ id: z.string().uuid() });

const saveReferenceSchema = z.object({
  id: z.string().uuid().optional(),
  event_id: z.string().uuid(),
  title: z.string().trim().min(1),
  category: z.string().trim().min(1),
  image_url: z.string().trim().nullable().optional(),
  inspiration_link: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
});

export const listReferencesFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await guardAdmin(context);

    const [references, events] = await Promise.all([
      db.eventReference.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          event: {
            select: {
              eventType: true,
              eventDate: true,
              client: { select: { fullName: true } },
            },
          },
        },
      }),
      db.event.findMany({
        select: {
          id: true,
          eventType: true,
          eventDate: true,
          client: { select: { fullName: true } },
        },
        orderBy: { eventDate: "asc" },
      }),
    ]);

    return {
      references: references.map(eventReferenceRecord),
      events: events.map(eventOptionRecord),
    };
  });

export const saveReferenceFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => saveReferenceSchema.parse(data))
  .handler(async ({ data, context }) => {
    await guardAdmin(context);

    const payload = {
      eventId: data.event_id,
      title: data.title,
      category: data.category,
      imageUrl: data.image_url || null,
      inspirationLink: data.inspiration_link || null,
      notes: data.notes || null,
    };

    const row = data.id
      ? await db.eventReference.update({
          where: { id: data.id },
          data: payload,
          include: {
            event: {
              select: {
                eventType: true,
                eventDate: true,
                client: { select: { fullName: true } },
              },
            },
          },
        })
      : await db.eventReference.create({
          data: payload,
          include: {
            event: {
              select: {
                eventType: true,
                eventDate: true,
                client: { select: { fullName: true } },
              },
            },
          },
        });

    return eventReferenceRecord(row);
  });

export const deleteReferenceFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => idSchema.parse(data))
  .handler(async ({ data, context }) => {
    await guardAdmin(context);
    await db.eventReference.delete({ where: { id: data.id } });
    return { ok: true as const };
  });
