import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/integrations/auth/auth-middleware";
import { clientOwnsEvent } from "@/lib/auth-session";
import { toIsoString } from "@/lib/api-map";
import { db } from "@/lib/db";
import { PALLAZIUM_ADDRESS, PALLAZIUM_MAP_URL } from "@/lib/pallazium-venue";

export type InvitationRow = {
  id: string;
  event_id: string;
  public_token: string;
  title: string;
  message: string | null;
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
  status: "rascunho" | "publicado" | "pausado";
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type GuestRow = {
  id: string;
  event_id: string;
  invitation_id: string | null;
  public_token: string;
  name: string;
  phone: string | null;
  email: string | null;
  group_name: string | null;
  allowed_companions: number;
  confirmed_companions: number;
  rsvp_status: "pendente" | "confirmado" | "recusado";
  dietary_restrictions: string | null;
  notes: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PartyMemberRow = {
  id: string;
  event_id: string;
  name: string;
  role: string;
  side: string | null;
  phone: string | null;
  email: string | null;
  attire: string | null;
  rsvp_status: "pendente" | "confirmado" | "recusado";
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type GiftItemRow = {
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

export type ConvitesPageData = {
  invitation: InvitationRow | null;
  guests: GuestRow[];
  party: PartyMemberRow[];
  giftItems: GiftItemRow[];
};

function mapInvitation(row: {
  id: string;
  eventId: string;
  publicToken: string;
  title: string;
  message: string | null;
  coverImageUrl: string | null;
  dressCode: string | null;
  ceremonyExternal: boolean;
  ceremonyLocation: string | null;
  ceremonyAddress: string | null;
  ceremonyMapUrl: string | null;
  receptionLocation: string | null;
  mapUrl: string | null;
  giftListUrl: string | null;
  whatsappText: string | null;
  status: "rascunho" | "publicado" | "pausado";
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): InvitationRow {
  return {
    id: row.id,
    event_id: row.eventId,
    public_token: row.publicToken,
    title: row.title,
    message: row.message,
    cover_image_url: row.coverImageUrl,
    dress_code: row.dressCode,
    ceremony_external: row.ceremonyExternal,
    ceremony_location: row.ceremonyLocation,
    ceremony_address: row.ceremonyAddress,
    ceremony_map_url: row.ceremonyMapUrl,
    reception_location: row.receptionLocation,
    map_url: row.mapUrl,
    gift_list_url: row.giftListUrl,
    whatsapp_text: row.whatsappText,
    status: row.status,
    published_at: toIsoString(row.publishedAt),
    created_at: toIsoString(row.createdAt)!,
    updated_at: toIsoString(row.updatedAt)!,
  };
}

function mapGuest(row: {
  id: string;
  eventId: string;
  invitationId: string | null;
  publicToken: string;
  name: string;
  phone: string | null;
  email: string | null;
  groupName: string | null;
  allowedCompanions: number;
  confirmedCompanions: number;
  rsvpStatus: "pendente" | "confirmado" | "recusado";
  dietaryRestrictions: string | null;
  notes: string | null;
  respondedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): GuestRow {
  return {
    id: row.id,
    event_id: row.eventId,
    invitation_id: row.invitationId,
    public_token: row.publicToken,
    name: row.name,
    phone: row.phone,
    email: row.email,
    group_name: row.groupName,
    allowed_companions: row.allowedCompanions,
    confirmed_companions: row.confirmedCompanions,
    rsvp_status: row.rsvpStatus,
    dietary_restrictions: row.dietaryRestrictions,
    notes: row.notes,
    responded_at: toIsoString(row.respondedAt),
    created_at: toIsoString(row.createdAt)!,
    updated_at: toIsoString(row.updatedAt)!,
  };
}

function mapPartyMember(row: {
  id: string;
  eventId: string;
  name: string;
  role: string;
  side: string | null;
  phone: string | null;
  email: string | null;
  attire: string | null;
  rsvpStatus: "pendente" | "confirmado" | "recusado";
  notes: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}): PartyMemberRow {
  return {
    id: row.id,
    event_id: row.eventId,
    name: row.name,
    role: row.role,
    side: row.side,
    phone: row.phone,
    email: row.email,
    attire: row.attire,
    rsvp_status: row.rsvpStatus,
    notes: row.notes,
    sort_order: row.sortOrder,
    created_at: toIsoString(row.createdAt)!,
    updated_at: toIsoString(row.updatedAt)!,
  };
}

function mapGiftItem(row: {
  id: string;
  eventId: string;
  name: string;
  referenceLinks: string[];
  imageUrl: string | null;
  notes: string | null;
  sortOrder: number;
  reservedByGuestId: string | null;
  reservedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): GiftItemRow {
  return {
    id: row.id,
    event_id: row.eventId,
    name: row.name,
    reference_links: row.referenceLinks,
    image_url: row.imageUrl,
    notes: row.notes,
    sort_order: row.sortOrder,
    reserved_by_guest_id: row.reservedByGuestId,
    reserved_at: toIsoString(row.reservedAt),
    created_at: toIsoString(row.createdAt)!,
    updated_at: toIsoString(row.updatedAt)!,
  };
}

async function assertEventAccess(userId: string, eventId: string) {
  const owns = await clientOwnsEvent(userId, eventId);
  if (!owns) throw new Error("Acesso negado.");
}

const eventIdInput = z.object({ eventId: z.string().uuid() });

export const getConvitesPageDataFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((data) => eventIdInput.parse(data))
  .handler(async ({ data, context }): Promise<ConvitesPageData> => {
    await assertEventAccess(context.userId, data.eventId);

    const [invitation, guests, party, giftItems] = await Promise.all([
      db.eventInvitation.findUnique({ where: { eventId: data.eventId } }),
      db.eventGuest.findMany({
        where: { eventId: data.eventId },
        orderBy: { createdAt: "asc" },
      }),
      db.eventPartyMember.findMany({
        where: { eventId: data.eventId },
        orderBy: { sortOrder: "asc" },
      }),
      db.eventGiftItem.findMany({
        where: { eventId: data.eventId },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    return {
      invitation: invitation ? mapInvitation(invitation) : null,
      guests: guests.map(mapGuest),
      party: party.map(mapPartyMember),
      giftItems: giftItems.map(mapGiftItem),
    };
  });

const saveGuestInput = z.object({
  eventId: z.string().uuid(),
  invitationId: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(1),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  groupName: z.string().nullable().optional(),
  allowedCompanions: z.number().int().min(0),
  confirmedCompanions: z.number().int().min(0),
  rsvpStatus: z.enum(["pendente", "confirmado", "recusado"]),
  notes: z.string().nullable().optional(),
});

export const createGuestFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => saveGuestInput.parse(data))
  .handler(async ({ data, context }) => {
    await assertEventAccess(context.userId, data.eventId);

    const guest = await db.eventGuest.create({
      data: {
        eventId: data.eventId,
        invitationId: data.invitationId ?? null,
        name: data.name,
        phone: data.phone ?? null,
        email: data.email ?? null,
        groupName: data.groupName ?? null,
        allowedCompanions: data.allowedCompanions,
        confirmedCompanions: data.confirmedCompanions,
        rsvpStatus: data.rsvpStatus,
        notes: data.notes ?? null,
        respondedAt: data.rsvpStatus === "pendente" ? null : new Date(),
      },
    });

    return mapGuest(guest);
  });

const deleteGuestInput = z.object({
  eventId: z.string().uuid(),
  guestId: z.string().uuid(),
});

export const deleteGuestFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => deleteGuestInput.parse(data))
  .handler(async ({ data, context }) => {
    await assertEventAccess(context.userId, data.eventId);

    const guest = await db.eventGuest.findFirst({
      where: { id: data.guestId, eventId: data.eventId },
    });
    if (!guest) throw new Error("Convidado não encontrado.");

    await db.eventGuest.delete({ where: { id: data.guestId } });
    return { ok: true as const };
  });

const saveInvitationInput = z.object({
  eventId: z.string().uuid(),
  invitationId: z.string().uuid().optional(),
  title: z.string().trim().min(1),
  message: z.string().nullable().optional(),
  coverImageUrl: z.string().nullable().optional(),
  dressCode: z.string().nullable().optional(),
  ceremonyExternal: z.boolean().default(false),
  ceremonyLocation: z.string().nullable().optional(),
  ceremonyAddress: z.string().nullable().optional(),
  ceremonyMapUrl: z.string().nullable().optional(),
  status: z.enum(["rascunho", "publicado", "pausado"]),
  publishedAt: z.string().nullable().optional(),
});

export const saveInvitationFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => saveInvitationInput.parse(data))
  .handler(async ({ data, context }) => {
    await assertEventAccess(context.userId, data.eventId);

    const publishedAt =
      data.status === "publicado"
        ? data.publishedAt
          ? new Date(data.publishedAt)
          : new Date()
        : data.publishedAt
          ? new Date(data.publishedAt)
          : null;

    const payload = {
      title: data.title,
      message: data.message ?? null,
      coverImageUrl: data.coverImageUrl ?? null,
      dressCode: data.dressCode ?? null,
      ceremonyExternal: data.ceremonyExternal,
      ceremonyLocation: data.ceremonyExternal ? data.ceremonyLocation ?? null : null,
      ceremonyAddress: data.ceremonyExternal ? data.ceremonyAddress ?? null : null,
      ceremonyMapUrl: data.ceremonyExternal ? data.ceremonyMapUrl ?? null : null,
      receptionLocation: PALLAZIUM_ADDRESS,
      mapUrl: PALLAZIUM_MAP_URL,
      status: data.status,
      publishedAt,
    };

    const invitation = data.invitationId
      ? await db.eventInvitation.update({
          where: { id: data.invitationId },
          data: payload,
        })
      : await db.eventInvitation.create({
          data: { eventId: data.eventId, ...payload },
        });

    return mapInvitation(invitation);
  });

const saveGiftItemInput = z.object({
  eventId: z.string().uuid(),
  giftItemId: z.string().uuid().optional(),
  name: z.string().trim().min(1),
  imageUrl: z.string().nullable().optional(),
  referenceLinks: z.array(z.string()),
  notes: z.string().nullable().optional(),
  sortOrder: z.number().int().min(0),
});

export const saveGiftItemFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => saveGiftItemInput.parse(data))
  .handler(async ({ data, context }) => {
    await assertEventAccess(context.userId, data.eventId);

    const payload = {
      name: data.name,
      imageUrl: data.imageUrl ?? null,
      referenceLinks: data.referenceLinks,
      notes: data.notes ?? null,
      sortOrder: data.sortOrder,
    };

    const item = data.giftItemId
      ? await db.eventGiftItem.update({
          where: { id: data.giftItemId },
          data: payload,
        })
      : await db.eventGiftItem.create({
          data: { eventId: data.eventId, ...payload },
        });

    return mapGiftItem(item);
  });

const deleteGiftItemInput = z.object({
  eventId: z.string().uuid(),
  giftItemId: z.string().uuid(),
});

export const deleteGiftItemFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => deleteGiftItemInput.parse(data))
  .handler(async ({ data, context }) => {
    await assertEventAccess(context.userId, data.eventId);

    const item = await db.eventGiftItem.findFirst({
      where: { id: data.giftItemId, eventId: data.eventId },
    });
    if (!item) throw new Error("Item não encontrado.");

    await db.eventGiftItem.delete({ where: { id: data.giftItemId } });
    return { ok: true as const };
  });
