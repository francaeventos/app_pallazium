import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/integrations/auth/auth-middleware";
import { getClientForUser } from "@/lib/auth-session";
import { toDateString, toIsoString, toTimeString } from "@/lib/api-map";
import { db } from "@/lib/db";

export type ClientSummary = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  status: string;
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
};

export const getMyEventFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<EventBundle> => {
    const client = await getClientForUser(context.userId);
    if (!client) {
      return { event: null, client: null, checklist: [] };
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
      };
    }

    const checklistItems = await db.checklistItem.findMany({
      where: { eventId: event.id },
      orderBy: { sortOrder: "asc" },
    });

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
    };
  });
