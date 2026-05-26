import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { requireAuth } from "@/integrations/auth/auth-middleware";
import { clientOwnsEvent, getClientForUser } from "@/lib/auth-session";
import { toIsoString } from "@/lib/api-map";
import { db } from "@/lib/db";

export type UpgradeRow = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  image_url: string | null;
  price_text: string | null;
  active: boolean;
  created_at: string;
};

export type UpgradeInterestRow = {
  upgrade_id: string;
  status: string;
};

export type UpgradesPageData = {
  upgrades: UpgradeRow[];
  interests: UpgradeInterestRow[];
};

const registerUpgradeInterestInput = z.object({
  upgradeId: z.string().uuid(),
  eventId: z.string().uuid(),
});

export const getUpgradesPageDataFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<UpgradesPageData> => {
    const upgrades = await db.upgrade.findMany({
      where: { active: true },
      orderBy: { category: "asc" },
    });

    const client = await getClientForUser(context.userId);
    let interests: UpgradeInterestRow[] = [];

    if (client) {
      const event = await db.event.findFirst({
        where: {
          clientId: client.id,
          status: { not: "cancelado" },
        },
        orderBy: { eventDate: "asc" },
      });

      if (event) {
        const rows = await db.upgradeInterest.findMany({
          where: { clientId: client.id, eventId: event.id },
          select: { upgradeId: true, status: true },
        });
        interests = rows.map((row) => ({
          upgrade_id: row.upgradeId,
          status: row.status,
        }));
      }
    }

    return {
      upgrades: upgrades.map((upgrade) => ({
        id: upgrade.id,
        name: upgrade.name,
        description: upgrade.description,
        category: upgrade.category,
        image_url: upgrade.imageUrl,
        price_text: upgrade.priceText,
        active: upgrade.active,
        created_at: toIsoString(upgrade.createdAt)!,
      })),
      interests,
    };
  });

export const registerUpgradeInterestFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => registerUpgradeInterestInput.parse(data))
  .handler(async ({ data, context }) => {
    const client = await getClientForUser(context.userId);
    if (!client) throw new Error("Evento não vinculado.");

    const owns = await clientOwnsEvent(context.userId, data.eventId);
    if (!owns) throw new Error("Acesso negado.");

    try {
      await db.upgradeInterest.create({
        data: {
          upgradeId: data.upgradeId,
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
