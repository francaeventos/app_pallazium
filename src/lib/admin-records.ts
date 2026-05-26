import type {
  Client,
  Ebook,
  Event,
  EventGuest,
  EventInvitation,
  EventPartyMember,
  EventReference,
  Menu,
  MenuInterest,
  Notification,
  Partner,
  PortfolioItem,
  Tip,
  Upgrade,
  UpgradeInterest,
} from "@/generated/prisma/client";

function isoDate(value: Date | null | undefined) {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

function isoDateTime(value: Date) {
  return value.toISOString();
}

function bigintToNumber(value: bigint | null | undefined) {
  if (value == null) return null;
  return Number(value);
}

export function menuRecord(row: Menu) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    items: row.items,
    image_url: row.imageUrl,
    images: row.images,
    notes: row.notes,
    active: row.active,
    created_at: isoDateTime(row.createdAt),
  };
}

export function upgradeRecord(row: Upgrade) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    image_url: row.imageUrl,
    price_text: row.priceText,
    active: row.active,
    created_at: isoDateTime(row.createdAt),
  };
}

export function partnerRecord(row: Partner) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    phone: row.phone,
    whatsapp: row.whatsapp,
    instagram: row.instagram,
    image_url: row.imageUrl,
    active: row.active,
    created_at: isoDateTime(row.createdAt),
  };
}

export function tipRecord(row: Tip) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    content: row.content,
    image_url: row.imageUrl,
    active: row.active,
    created_at: isoDateTime(row.createdAt),
  };
}

export function portfolioRecord(row: PortfolioItem) {
  return {
    id: row.id,
    event_name: row.eventName,
    event_type: row.eventType,
    category: row.category,
    description: row.description,
    highlights: row.highlights,
    images: row.images,
    active: row.active,
    created_at: isoDateTime(row.createdAt),
  };
}

export function ebookRecord(row: Ebook) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    cover_url: row.coverUrl,
    file_url: row.fileUrl,
    file_name: row.fileName,
    file_size: bigintToNumber(row.fileSize),
    active: row.active,
    created_at: isoDateTime(row.createdAt),
    updated_at: isoDateTime(row.updatedAt),
  };
}

export function notificationRecord(row: Notification) {
  return {
    id: row.id,
    user_id: row.userId,
    title: row.title,
    message: row.message,
    read: row.read,
    created_at: isoDateTime(row.createdAt),
  };
}

export function clientOptionRecord(row: Pick<Client, "id" | "fullName" | "email" | "userId">) {
  return {
    id: row.id,
    full_name: row.fullName,
    email: row.email,
    user_id: row.userId,
  };
}

export function eventReferenceRecord(
  row: EventReference & {
    event?: {
      eventType: string;
      eventDate: Date | null;
      client?: { fullName: string } | null;
    } | null;
  },
) {
  return {
    id: row.id,
    event_id: row.eventId,
    title: row.title,
    category: row.category,
    image_url: row.imageUrl,
    inspiration_link: row.inspirationLink,
    notes: row.notes,
    created_at: isoDateTime(row.createdAt),
    events: row.event
      ? {
          event_type: row.event.eventType,
          event_date: isoDate(row.event.eventDate),
          clients: row.event.client ? { full_name: row.event.client.fullName } : null,
        }
      : null,
  };
}

export function eventOptionRecord(
  row: Pick<Event, "id" | "eventType" | "eventDate"> & {
    client?: { fullName: string } | null;
  },
) {
  return {
    id: row.id,
    event_type: row.eventType,
    event_date: isoDate(row.eventDate),
    clients: row.client ? { full_name: row.client.fullName } : null,
  };
}

export function upgradeInterestRecord(
  row: UpgradeInterest & {
    upgrade?: Pick<Upgrade, "name" | "category"> | null;
    client?: Pick<Client, "fullName" | "email" | "whatsapp"> | null;
    event?: Pick<Event, "eventType" | "eventDate"> | null;
  },
) {
  return {
    id: row.id,
    upgrade_id: row.upgradeId,
    event_id: row.eventId,
    client_id: row.clientId,
    status: row.status,
    notes: row.notes,
    created_at: isoDateTime(row.createdAt),
    upgrades: row.upgrade
      ? { name: row.upgrade.name, category: row.upgrade.category }
      : null,
    clients: row.client
      ? {
          full_name: row.client.fullName,
          email: row.client.email,
          whatsapp: row.client.whatsapp,
        }
      : null,
    events: row.event
      ? {
          event_type: row.event.eventType,
          event_date: isoDate(row.event.eventDate),
        }
      : null,
  };
}

export function menuInterestRecord(
  row: MenuInterest & {
    menu?: Pick<Menu, "name" | "category"> | null;
    client?: Pick<Client, "fullName" | "email" | "whatsapp"> | null;
    event?: Pick<Event, "eventType" | "eventDate"> | null;
  },
) {
  return {
    id: row.id,
    menu_id: row.menuId,
    event_id: row.eventId,
    client_id: row.clientId,
    status: row.status,
    notes: row.notes,
    created_at: isoDateTime(row.createdAt),
    menus: row.menu ? { name: row.menu.name, category: row.menu.category } : null,
    clients: row.client
      ? {
          full_name: row.client.fullName,
          email: row.client.email,
          whatsapp: row.client.whatsapp,
        }
      : null,
    events: row.event
      ? {
          event_type: row.event.eventType,
          event_date: isoDate(row.event.eventDate),
        }
      : null,
  };
}

export function eventRowRecord(
  row: Event & { client?: Pick<Client, "fullName" | "email"> | null },
) {
  return {
    id: row.id,
    client_id: row.clientId,
    event_type: row.eventType,
    event_date: isoDate(row.eventDate),
    start_time: row.startTime,
    end_time: row.endTime,
    location: row.location,
    estimated_guests: row.estimatedGuests,
    contracted_value: row.contractedValue,
    financial_status: row.financialStatus,
    status: row.status,
    internal_notes: row.internalNotes,
    client_notes: row.clientNotes,
    created_at: isoDateTime(row.createdAt),
    updated_at: isoDateTime(row.updatedAt),
    clients: row.client
      ? { full_name: row.client.fullName, email: row.client.email }
      : null,
  };
}

export function invitationRecord(row: EventInvitation) {
  return {
    id: row.id,
    event_id: row.eventId,
    public_token: row.publicToken,
    title: row.title,
    message: row.message,
    cover_image_url: row.coverImageUrl,
    dress_code: row.dressCode,
    ceremony_location: row.ceremonyLocation,
    reception_location: row.receptionLocation,
    map_url: row.mapUrl,
    gift_list_url: row.giftListUrl,
    whatsapp_text: row.whatsappText,
    status: row.status,
    published_at: row.publishedAt ? isoDateTime(row.publishedAt) : null,
    created_at: isoDateTime(row.createdAt),
    updated_at: isoDateTime(row.updatedAt),
  };
}

export function guestRecord(row: EventGuest) {
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
    responded_at: row.respondedAt ? isoDateTime(row.respondedAt) : null,
    created_at: isoDateTime(row.createdAt),
    updated_at: isoDateTime(row.updatedAt),
  };
}

export function partyMemberRecord(row: EventPartyMember) {
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
    created_at: isoDateTime(row.createdAt),
    updated_at: isoDateTime(row.updatedAt),
  };
}
