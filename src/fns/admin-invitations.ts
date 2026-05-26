import { randomBytes } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/integrations/auth/auth-middleware";
import { assertAdmin } from "@/lib/auth-session";
import {
  eventRowRecord,
  guestRecord,
  invitationRecord,
  partyMemberRecord,
} from "@/lib/admin-records";

async function guardAdmin(context: { userId?: string }) {
  const userId = context.userId;
  if (!userId) throw new Error("Sessão inválida.");
  await assertAdmin(userId);
}

const eventIdSchema = z.object({ eventId: z.string().uuid() });
const idSchema = z.object({ id: z.string().uuid() });

const invitationStatusSchema = z.enum(["rascunho", "publicado", "pausado"]);
const rsvpStatusSchema = z.enum(["pendente", "confirmado", "recusado"]);

const saveInvitationSchema = z.object({
  id: z.string().uuid().optional(),
  event_id: z.string().uuid(),
  title: z.string().trim().min(1),
  message: z.string().trim().optional(),
  cover_image_url: z.string().trim().optional(),
  dress_code: z.string().trim().optional(),
  ceremony_location: z.string().trim().optional(),
  reception_location: z.string().trim().optional(),
  map_url: z.string().trim().optional(),
  gift_list_url: z.string().trim().optional(),
  whatsapp_text: z.string().trim().optional(),
  status: invitationStatusSchema,
  published_at: z.string().datetime().optional().nullable(),
});

const saveGuestSchema = z.object({
  id: z.string().uuid().optional(),
  event_id: z.string().uuid(),
  invitation_id: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(1),
  phone: z.string().trim().optional(),
  email: z.string().trim().optional(),
  group_name: z.string().trim().optional(),
  allowed_companions: z.number().int().min(0).default(0),
  confirmed_companions: z.number().int().min(0).default(0),
  rsvp_status: rsvpStatusSchema,
  notes: z.string().trim().optional(),
  public_token: z.string().trim().optional(),
});

const savePartyMemberSchema = z.object({
  id: z.string().uuid().optional(),
  event_id: z.string().uuid(),
  name: z.string().trim().min(1),
  role: z.string().trim().min(1),
  side: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().optional(),
  attire: z.string().trim().optional(),
  rsvp_status: rsvpStatusSchema,
  notes: z.string().trim().optional(),
  sort_order: z.number().int().default(0),
});

function createPublicToken() {
  return randomBytes(16).toString("hex");
}

export const listInvitationEventsFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await guardAdmin(context);
    const rows = await db.event.findMany({
      include: { client: { select: { fullName: true, email: true } } },
      orderBy: { eventDate: "asc" },
    });
    return rows.map(eventRowRecord);
  });

export const getInvitationDetailsFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((data) => eventIdSchema.parse(data))
  .handler(async ({ data, context }) => {
    await guardAdmin(context);

    const [invitation, guests, party] = await Promise.all([
      db.eventInvitation.findUnique({ where: { eventId: data.eventId } }),
      db.eventGuest.findMany({
        where: { eventId: data.eventId },
        orderBy: { createdAt: "asc" },
      }),
      db.eventPartyMember.findMany({
        where: { eventId: data.eventId },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    const guestsWithTokens = await Promise.all(
      guests.map(async (guest) => {
        if (guest.publicToken) return guest;
        const publicToken = createPublicToken();
        return db.eventGuest.update({
          where: { id: guest.id },
          data: { publicToken },
        });
      }),
    );

    return {
      invitation: invitation ? invitationRecord(invitation) : null,
      guests: guestsWithTokens.map(guestRecord),
      party: party.map(partyMemberRecord),
    };
  });

export const saveInvitationFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => saveInvitationSchema.parse(data))
  .handler(async ({ data, context }) => {
    await guardAdmin(context);

    const publishedAt =
      data.status === "publicado"
        ? data.published_at
          ? new Date(data.published_at)
          : new Date()
        : data.published_at
          ? new Date(data.published_at)
          : null;

    const payload = {
      eventId: data.event_id,
      title: data.title,
      message: data.message || null,
      coverImageUrl: data.cover_image_url || null,
      dressCode: data.dress_code || null,
      ceremonyLocation: data.ceremony_location || null,
      receptionLocation: data.reception_location || null,
      mapUrl: data.map_url || null,
      giftListUrl: data.gift_list_url || null,
      whatsappText: data.whatsapp_text || null,
      status: data.status,
      publishedAt,
    };

    const row = data.id
      ? await db.eventInvitation.update({ where: { id: data.id }, data: payload })
      : await db.eventInvitation.create({ data: payload });

    await db.eventGuest.updateMany({
      where: { eventId: data.event_id, invitationId: null },
      data: { invitationId: row.id },
    });

    return invitationRecord(row);
  });

export const saveGuestFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => saveGuestSchema.parse(data))
  .handler(async ({ data, context }) => {
    await guardAdmin(context);

    const allowedCompanions = data.allowed_companions;
    const confirmedCompanions = Math.min(data.confirmed_companions, allowedCompanions);
    const respondedAt = data.rsvp_status === "pendente" ? null : new Date();

    const payload = {
      eventId: data.event_id,
      invitationId: data.invitation_id ?? null,
      name: data.name,
      phone: data.phone || null,
      email: data.email || null,
      groupName: data.group_name || null,
      allowedCompanions,
      confirmedCompanions,
      rsvpStatus: data.rsvp_status,
      notes: data.notes || null,
      publicToken: data.public_token || createPublicToken(),
      respondedAt,
    };

    const row = data.id
      ? await db.eventGuest.update({ where: { id: data.id }, data: payload })
      : await db.eventGuest.create({ data: payload });

    return guestRecord(row);
  });

export const savePartyMemberFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => savePartyMemberSchema.parse(data))
  .handler(async ({ data, context }) => {
    await guardAdmin(context);

    const payload = {
      eventId: data.event_id,
      name: data.name,
      role: data.role,
      side: data.side || null,
      phone: data.phone || null,
      email: data.email || null,
      attire: data.attire || null,
      rsvpStatus: data.rsvp_status,
      notes: data.notes || null,
      sortOrder: data.sort_order,
    };

    const row = data.id
      ? await db.eventPartyMember.update({ where: { id: data.id }, data: payload })
      : await db.eventPartyMember.create({ data: payload });

    return partyMemberRecord(row);
  });

export const deleteGuestFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => idSchema.parse(data))
  .handler(async ({ data, context }) => {
    await guardAdmin(context);
    await db.eventGuest.delete({ where: { id: data.id } });
    return { ok: true as const };
  });

export const deletePartyMemberFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => idSchema.parse(data))
  .handler(async ({ data, context }) => {
    await guardAdmin(context);
    await db.eventPartyMember.delete({ where: { id: data.id } });
    return { ok: true as const };
  });

export const ensureGuestTokenFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => idSchema.parse(data))
  .handler(async ({ data, context }) => {
    await guardAdmin(context);

    const guest = await db.eventGuest.findUnique({ where: { id: data.id } });
    if (!guest) throw new Error("Convidado não encontrado.");
    if (guest.publicToken) return guestRecord(guest);

    const row = await db.eventGuest.update({
      where: { id: data.id },
      data: { publicToken: createPublicToken() },
    });

    return guestRecord(row);
  });
