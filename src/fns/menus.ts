import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { requireAuth } from "@/integrations/auth/auth-middleware";
import { clientOwnsEvent, getClientForUser } from "@/lib/auth-session";
import { toIsoString } from "@/lib/api-map";
import { db } from "@/lib/db";

export type MenuRow = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  items: string | null;
  image_url: string | null;
  images: string[];
  notes: string | null;
  active: boolean;
  created_at: string;
};

export type MenuInterestRow = {
  menu_id: string;
  status: string;
};

export type MenusPageData = {
  menus: MenuRow[];
  interests: MenuInterestRow[];
};

const registerMenuInterestInput = z.object({
  menuId: z.string().uuid(),
  eventId: z.string().uuid(),
});

export const getMenusPageDataFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<MenusPageData> => {
    const menus = await db.menu.findMany({
      where: { active: true },
      orderBy: { category: "asc" },
    });

    const client = await getClientForUser(context.userId);
    let interests: MenuInterestRow[] = [];

    if (client) {
      const event = await db.event.findFirst({
        where: {
          clientId: client.id,
          status: { not: "cancelado" },
        },
        orderBy: { eventDate: "asc" },
      });

      if (event) {
        const rows = await db.menuInterest.findMany({
          where: { clientId: client.id, eventId: event.id },
          select: { menuId: true, status: true },
        });
        interests = rows.map((row) => ({
          menu_id: row.menuId,
          status: row.status,
        }));
      }
    }

    return {
      menus: menus.map((menu) => ({
        id: menu.id,
        name: menu.name,
        description: menu.description,
        category: menu.category,
        items: menu.items,
        image_url: menu.imageUrl,
        images: menu.images,
        notes: menu.notes,
        active: menu.active,
        created_at: toIsoString(menu.createdAt)!,
      })),
      interests,
    };
  });

export const registerMenuInterestFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => registerMenuInterestInput.parse(data))
  .handler(async ({ data, context }) => {
    const client = await getClientForUser(context.userId);
    if (!client) throw new Error("Evento não vinculado.");

    const owns = await clientOwnsEvent(context.userId, data.eventId);
    if (!owns) throw new Error("Acesso negado.");

    try {
      await db.menuInterest.create({
        data: {
          menuId: data.menuId,
          clientId: client.id,
          eventId: data.eventId,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new Error("DUPLICATE");
      }
      throw error;
    }

    return { ok: true as const };
  });
