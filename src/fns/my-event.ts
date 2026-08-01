import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/integrations/auth/auth-middleware";
import { getClientForUser } from "@/lib/auth-session";
import { toDateString, toIsoString, toTimeString } from "@/lib/api-map";
import { db } from "@/lib/db";
import { getConfirmedPartyCount } from "@/lib/guest-limit-server";

export type ClientSummary = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  status: string;
};

export type EventMenuSummary = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  items: string | null;
  image_url: string | null;
  images: string[];
};

export type EventUpgradeSummary = {
  id: string;
  name: string;
  description: string | null;
  price_text: string | null;
  image_url: string | null;
};

export type EventSummary = {
  id: string;
  client_id: string;
  event_type: string;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  estimated_guests: number | null;
  status: string;
  client_notes: string | null;
  menu: EventMenuSummary | null;
  upgrades: EventUpgradeSummary[];
};

export type ChecklistSummary = {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  client_notes: string | null;
  attachment_url: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type EventBundle = {
  event: EventSummary | null;
  client: ClientSummary | null;
  checklist: ChecklistSummary[];
  guestLimitExceeded: boolean;
};

export const getMyEventFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<EventBundle> => {
    const client = await getClientForUser(context.userId);
    if (!client) {
      return { event: null, client: null, checklist: [], guestLimitExceeded: false };
    }

    const event = await db.event.findFirst({
      where: {
        clientId: client.id,
        status: { not: "cancelado" },
      },
      orderBy: { eventDate: "asc" },
    });

    if (!event) {
      return {
        event: null,
        client: {
          id: client.id,
          full_name: client.fullName,
          email: client.email,
          phone: client.phone,
          whatsapp: client.whatsapp,
          status: client.status,
        },
        checklist: [],
        guestLimitExceeded: false,
      };
    }

    const [checklistItems, confirmedGuests, confirmedParty, menu, eventUpgrades] =
      await Promise.all([
        db.checklistItem.findMany({
          where: { eventId: event.id },
          orderBy: { sortOrder: "asc" },
        }),
        db.eventGuest.aggregate({
          where: { eventId: event.id, rsvpStatus: "confirmado" },
          _count: { _all: true },
          _sum: { confirmedCompanions: true },
        }),
        getConfirmedPartyCount(event.id),
        event.menuId ? db.menu.findUnique({ where: { id: event.menuId } }) : null,
        db.eventUpgrade.findMany({
          where: { eventId: event.id },
          include: { upgrade: true },
          orderBy: { createdAt: "asc" },
        }),
      ]);

    const confirmedPeopleTotal =
      confirmedGuests._count._all + (confirmedGuests._sum.confirmedCompanions ?? 0) + confirmedParty;
    const guestLimitExceeded =
      event.estimatedGuests != null && confirmedPeopleTotal > event.estimatedGuests * 1.1;

    return {
      client: {
        id: client.id,
        full_name: client.fullName,
        email: client.email,
        phone: client.phone,
        whatsapp: client.whatsapp,
        status: client.status,
      },
      event: {
        id: event.id,
        client_id: event.clientId,
        event_type: event.eventType,
        event_date: toDateString(event.eventDate),
        start_time: toTimeString(event.startTime),
        end_time: toTimeString(event.endTime),
        location: event.location,
        estimated_guests: event.estimatedGuests,
        status: event.status,
        client_notes: event.clientNotes,
        menu: menu
          ? {
              id: menu.id,
              name: menu.name,
              description: menu.description,
              category: menu.category,
              items: menu.items,
              image_url: menu.imageUrl,
              images: menu.images,
            }
          : null,
        upgrades: eventUpgrades.map((eu) => ({
          id: eu.upgrade.id,
          name: eu.upgrade.name,
          description: eu.upgrade.description,
          price_text: eu.upgrade.priceText,
          image_url: eu.upgrade.imageUrl,
        })),
      },
      checklist: checklistItems.map((item) => ({
        id: item.id,
        event_id: item.eventId,
        title: item.title,
        description: item.description,
        status: item.status,
        priority: item.priority,
        due_date: toDateString(item.dueDate),
        client_notes: item.clientNotes,
        attachment_url: item.attachmentUrl,
        sort_order: item.sortOrder,
        created_at: toIsoString(item.createdAt)!,
        updated_at: toIsoString(item.updatedAt)!,
      })),
      guestLimitExceeded,
    };
  });
