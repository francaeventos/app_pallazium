import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { EventGiftItem, EventGuest, EventInvitation, Event, RsvpStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { assertGuestLimitNotExceeded } from "@/lib/guest-limit";
import { getConfirmedPartyCount } from "@/lib/guest-limit-server";

export type PublicInvitationGuest = {
  event_id: string;
  invitation_id: string | null;
  invitation_title: string;
  invitation_message: string | null;
  cover_image_url: string | null;
  dress_code: string | null;
  ceremony_external: boolean;
  ceremony_location: string | null;
  ceremony_address: string | null;
  ceremony_map_url: string | null;
  reception_location: string | null;
  map_url: string | null;
  gift_list_url: string | null;
  whatsapp_text: string | null;
  event_type: string;
  event_date: string | null;
  start_time: string | null;
  event_location: string | null;
  guest_id: string;
  guest_name: string;
  guest_group_name: string | null;
  allowed_companions: number;
  confirmed_companions: number;
  rsvp_status: RsvpStatus;
  dietary_restrictions: string | null;
  responded_at: string | null;
};

export type PublicInvitationPreview = {
  invitation_id: string;
  invitation_title: string;
  invitation_message: string | null;
  cover_image_url: string | null;
  dress_code: string | null;
  ceremony_external: boolean;
  ceremony_location: string | null;
  ceremony_address: string | null;
  ceremony_map_url: string | null;
  reception_location: string | null;
  map_url: string | null;
  gift_list_url: string | null;
  event_type: string;
  event_date: string | null;
  start_time: string | null;
  event_location: string | null;
};

export type PublicGiftItem = {
  id: string;
  event_id: string;
  name: string;
  reference_links: string[];
  image_url: string | null;
  notes: string | null;
  sort_order: number;
  reserved_by_guest_id: string | null;
  reserved_at: string | null;
  created_at: string;
  updated_at: string;
};

type GuestWithRelations = EventGuest & {
  invitation: EventInvitation | null;
  event: Event;
};

function formatDate(value: Date | null | undefined) {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

function formatTime(value: Date | null | undefined) {
  if (!value) return null;
  return value.toISOString().slice(11, 19);
}

function formatTimestamp(value: Date | null | undefined) {
  return value?.toISOString() ?? null;
}

function formatInvitationGuest(guest: GuestWithRelations): PublicInvitationGuest {
  const invitation = guest.invitation;
  if (!invitation) {
    throw new Error("Convite não encontrado.");
  }

  return {
    event_id: guest.eventId,
    invitation_id: guest.invitationId,
    invitation_title: invitation.title,
    invitation_message: invitation.message,
    cover_image_url: invitation.coverImageUrl,
    dress_code: invitation.dressCode,
    ceremony_external: invitation.ceremonyExternal,
    ceremony_location: invitation.ceremonyLocation,
    ceremony_address: invitation.ceremonyAddress,
    ceremony_map_url: invitation.ceremonyMapUrl,
    reception_location: invitation.receptionLocation,
    map_url: invitation.mapUrl,
    gift_list_url: invitation.giftListUrl,
    whatsapp_text: invitation.whatsappText,
    event_type: guest.event.eventType,
    event_date: formatDate(guest.event.eventDate),
    start_time: formatTime(guest.event.startTime),
    event_location: guest.event.location,
    guest_id: guest.id,
    guest_name: guest.name,
    guest_group_name: guest.groupName,
    allowed_companions: guest.allowedCompanions,
    confirmed_companions: guest.confirmedCompanions,
    rsvp_status: guest.rsvpStatus,
    dietary_restrictions: guest.dietaryRestrictions,
    responded_at: formatTimestamp(guest.respondedAt),
  };
}

function formatGiftItem(item: EventGiftItem): PublicGiftItem {
  return {
    id: item.id,
    event_id: item.eventId,
    name: item.name,
    reference_links: item.referenceLinks,
    image_url: item.imageUrl,
    notes: item.notes,
    sort_order: item.sortOrder,
    reserved_by_guest_id: item.reservedByGuestId,
    reserved_at: formatTimestamp(item.reservedAt),
    created_at: item.createdAt.toISOString(),
    updated_at: item.updatedAt.toISOString(),
  };
}

async function findPublishedGuestByToken(token: string) {
  return db.eventGuest.findFirst({
    where: {
      publicToken: token,
      invitation: { status: "publicado" },
    },
    include: {
      invitation: true,
      event: true,
    },
  });
}

async function findPublishedInvitationById(invitationId: string) {
  return db.eventInvitation.findFirst({
    where: { id: invitationId, status: "publicado" },
    include: { event: true },
  });
}

function formatInvitationPreview(
  invitation: EventInvitation & { event: Event },
): PublicInvitationPreview {
  return {
    invitation_id: invitation.id,
    invitation_title: invitation.title,
    invitation_message: invitation.message,
    cover_image_url: invitation.coverImageUrl,
    dress_code: invitation.dressCode,
    ceremony_external: invitation.ceremonyExternal,
    ceremony_location: invitation.ceremonyLocation,
    ceremony_address: invitation.ceremonyAddress,
    ceremony_map_url: invitation.ceremonyMapUrl,
    reception_location: invitation.receptionLocation,
    map_url: invitation.mapUrl,
    gift_list_url: invitation.giftListUrl,
    event_type: invitation.event.eventType,
    event_date: formatDate(invitation.event.eventDate),
    start_time: formatTime(invitation.event.startTime),
    event_location: invitation.event.location,
  };
}

const tokenSchema = z.object({
  guestToken: z.string().trim().min(1),
});

const invitationIdSchema = z.object({
  invitationId: z.string().uuid(),
});

const respondSchema = tokenSchema.extend({
  rsvpStatus: z.enum(["confirmado", "recusado"]),
  confirmedCompanions: z.number().int().min(0).optional(),
  dietaryRestrictions: z.string().trim().max(500).nullable().optional(),
});

const giftItemSchema = tokenSchema.extend({
  giftItemId: z.string().uuid(),
});

export const getInvitationGuestByTokenFn = createServerFn({ method: "GET" })
  .inputValidator((data) => tokenSchema.parse(data))
  .handler(async ({ data }) => {
    const guest = await findPublishedGuestByToken(data.guestToken);
    if (!guest?.invitation) return null;
    return formatInvitationGuest(guest);
  });

export const getPublicEventGiftItemsByTokenFn = createServerFn({ method: "GET" })
  .inputValidator((data) => tokenSchema.parse(data))
  .handler(async ({ data }) => {
    const guest = await findPublishedGuestByToken(data.guestToken);
    if (!guest) return [] as PublicGiftItem[];

    const items = await db.eventGiftItem.findMany({
      where: {
        eventId: guest.eventId,
        OR: [{ reservedByGuestId: null }, { reservedByGuestId: guest.id }],
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return items.map(formatGiftItem);
  });

export const getInvitationPreviewFn = createServerFn({ method: "GET" })
  .inputValidator((data) => invitationIdSchema.parse(data))
  .handler(async ({ data }) => {
    const invitation = await findPublishedInvitationById(data.invitationId);
    if (!invitation) return null;
    return formatInvitationPreview(invitation);
  });

export const getPublicEventGiftItemsByInvitationFn = createServerFn({ method: "GET" })
  .inputValidator((data) => invitationIdSchema.parse(data))
  .handler(async ({ data }) => {
    const invitation = await findPublishedInvitationById(data.invitationId);
    if (!invitation) return [] as PublicGiftItem[];

    const items = await db.eventGiftItem.findMany({
      where: { eventId: invitation.eventId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return items.map(formatGiftItem);
  });

export const respondInvitationGuestFn = createServerFn({ method: "POST" })
  .inputValidator((data) => respondSchema.parse(data))
  .handler(async ({ data }) => {
    const guest = await findPublishedGuestByToken(data.guestToken);
    if (!guest) throw new Error("Convite indisponível.");

    const safeCompanions =
      data.rsvpStatus === "confirmado"
        ? Math.min(Math.max(data.confirmedCompanions ?? 0, 0), guest.allowedCompanions)
        : 0;

    if (data.rsvpStatus === "confirmado") {
      const [event, confirmedTotals, confirmedParty] = await Promise.all([
        db.event.findUnique({ where: { id: guest.eventId }, select: { estimatedGuests: true } }),
        db.eventGuest.aggregate({
          where: {
            eventId: guest.eventId,
            rsvpStatus: "confirmado",
            id: { not: guest.id },
          },
          _count: true,
          _sum: { confirmedCompanions: true },
        }),
        getConfirmedPartyCount(guest.eventId),
      ]);
      const otherPeople =
        confirmedTotals._count + (confirmedTotals._sum.confirmedCompanions ?? 0) + confirmedParty;
      const prospectivePeople = otherPeople + 1 + safeCompanions;
      assertGuestLimitNotExceeded(event?.estimatedGuests, prospectivePeople);
    }

    const dietaryRestrictions = data.dietaryRestrictions?.trim() || null;

    await db.eventGuest.update({
      where: { id: guest.id },
      data: {
        rsvpStatus: data.rsvpStatus,
        confirmedCompanions: safeCompanions,
        dietaryRestrictions,
        respondedAt: new Date(),
      },
    });

    const updated = await findPublishedGuestByToken(data.guestToken);
    if (!updated?.invitation) throw new Error("Convite indisponível.");
    return formatInvitationGuest(updated);
  });

export const reserveEventGiftItemFn = createServerFn({ method: "POST" })
  .inputValidator((data) => giftItemSchema.parse(data))
  .handler(async ({ data }) => {
    const guest = await findPublishedGuestByToken(data.guestToken);
    if (!guest) throw new Error("Convite indisponível.");

    const result = await db.eventGiftItem.updateMany({
      where: {
        id: data.giftItemId,
        eventId: guest.eventId,
        reservedByGuestId: null,
      },
      data: {
        reservedByGuestId: guest.id,
        reservedAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new Error("Este presente acabou de ser escolhido por outro convidado.");
    }

    const item = await db.eventGiftItem.findUnique({ where: { id: data.giftItemId } });
    if (!item) throw new Error("Presente não encontrado.");
    return formatGiftItem(item);
  });

export const releaseEventGiftItemReservationFn = createServerFn({ method: "POST" })
  .inputValidator((data) => giftItemSchema.parse(data))
  .handler(async ({ data }) => {
    const guest = await findPublishedGuestByToken(data.guestToken);
    if (!guest) throw new Error("Convite indisponível.");

    const result = await db.eventGiftItem.updateMany({
      where: {
        id: data.giftItemId,
        eventId: guest.eventId,
        reservedByGuestId: guest.id,
      },
      data: {
        reservedByGuestId: null,
        reservedAt: null,
      },
    });

    if (result.count === 0) {
      throw new Error("Não foi possível cancelar a reserva deste presente.");
    }

    const item = await db.eventGiftItem.findUnique({ where: { id: data.giftItemId } });
    if (!item) throw new Error("Presente não encontrado.");
    return formatGiftItem(item);
  });
