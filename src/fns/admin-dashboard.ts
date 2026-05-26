import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/integrations/auth/auth-middleware";
import { assertAdmin } from "@/lib/auth-session";
import { mapChecklistItemRow, mapEventRow } from "@/lib/admin-mappers";
import { db } from "@/lib/db";

export const getAdminDashboardFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);

    const [events, checklistItems, guests, upgradeInterests, menuInterests] =
      await Promise.all([
        db.event.findMany({
          include: {
            client: { select: { fullName: true, email: true, whatsapp: true } },
          },
          orderBy: { eventDate: "asc" },
        }),
        db.checklistItem.findMany({
          where: { status: { not: "concluido" } },
          select: {
            id: true,
            eventId: true,
            title: true,
            priority: true,
            status: true,
            dueDate: true,
            description: true,
            clientNotes: true,
            internalNotes: true,
            attachmentUrl: true,
            sortOrder: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        db.eventGuest.findMany({
          select: { eventId: true, rsvpStatus: true, confirmedCompanions: true },
        }),
        db.upgradeInterest.findMany({
          select: { id: true, eventId: true, status: true, createdAt: true },
        }),
        db.menuInterest.findMany({
          select: { id: true, eventId: true, status: true, createdAt: true },
        }),
      ]);

    return {
      events: events.map((e) => mapEventRow(e, e.client)),
      checklist_items: checklistItems.map(mapChecklistItemRow),
      guests: guests.map((g) => ({
        event_id: g.eventId,
        rsvp_status: g.rsvpStatus,
        confirmed_companions: g.confirmedCompanions,
      })),
      upgrade_interests: upgradeInterests.map((i) => ({
        id: i.id,
        event_id: i.eventId,
        status: i.status,
        created_at: i.createdAt.toISOString(),
      })),
      menu_interests: menuInterests.map((i) => ({
        id: i.id,
        event_id: i.eventId,
        status: i.status,
        created_at: i.createdAt.toISOString(),
      })),
    };
  });
