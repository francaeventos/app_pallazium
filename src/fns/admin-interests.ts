import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/integrations/auth/auth-middleware";
import { assertAdmin } from "@/lib/auth-session";
import { menuInterestRecord, upgradeInterestRecord } from "@/lib/admin-records";

async function guardAdmin(context: { userId?: string }) {
  const userId = context.userId;
  if (!userId) throw new Error("Sessão inválida.");
  await assertAdmin(userId);
}

const idSchema = z.object({ id: z.string().uuid() });
const interestStatusSchema = z.enum(["novo", "em_contato", "vendido", "perdido"]);

const updateInterestSchema = z.object({
  id: z.string().uuid(),
  status: interestStatusSchema,
  notes: z.string().trim().optional(),
});

export const listInterestsFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await guardAdmin(context);

    const [upgrades, menus] = await Promise.all([
      db.upgradeInterest.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          upgrade: { select: { name: true, category: true } },
          client: { select: { fullName: true, email: true, whatsapp: true } },
          event: { select: { eventType: true, eventDate: true } },
        },
      }),
      db.menuInterest.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          menu: { select: { name: true, category: true } },
          client: { select: { fullName: true, email: true, whatsapp: true } },
          event: { select: { eventType: true, eventDate: true } },
        },
      }),
    ]);

    return {
      upgradeInterests: upgrades.map(upgradeInterestRecord),
      menuInterests: menus.map(menuInterestRecord),
    };
  });

export const updateUpgradeInterestStatusFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) =>
    z.object({ id: z.string().uuid(), status: interestStatusSchema }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await guardAdmin(context);
    await db.upgradeInterest.update({
      where: { id: data.id },
      data: { status: data.status },
    });
    return { ok: true as const };
  });

export const updateMenuInterestStatusFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) =>
    z.object({ id: z.string().uuid(), status: interestStatusSchema }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await guardAdmin(context);
    await db.menuInterest.update({
      where: { id: data.id },
      data: { status: data.status },
    });
    return { ok: true as const };
  });

export const saveUpgradeInterestFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => updateInterestSchema.parse(data))
  .handler(async ({ data, context }) => {
    await guardAdmin(context);
    const row = await db.upgradeInterest.update({
      where: { id: data.id },
      data: { status: data.status, notes: data.notes || null },
      include: {
        upgrade: { select: { name: true, category: true } },
        client: { select: { fullName: true, email: true, whatsapp: true } },
        event: { select: { eventType: true, eventDate: true } },
      },
    });
    return upgradeInterestRecord(row);
  });

export const saveMenuInterestFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => updateInterestSchema.parse(data))
  .handler(async ({ data, context }) => {
    await guardAdmin(context);
    const row = await db.menuInterest.update({
      where: { id: data.id },
      data: { status: data.status, notes: data.notes || null },
      include: {
        menu: { select: { name: true, category: true } },
        client: { select: { fullName: true, email: true, whatsapp: true } },
        event: { select: { eventType: true, eventDate: true } },
      },
    });
    return menuInterestRecord(row);
  });

export const deleteUpgradeInterestFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => idSchema.parse(data))
  .handler(async ({ data, context }) => {
    await guardAdmin(context);
    await db.upgradeInterest.delete({ where: { id: data.id } });
    return { ok: true as const };
  });

export const deleteMenuInterestFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => idSchema.parse(data))
  .handler(async ({ data, context }) => {
    await guardAdmin(context);
    await db.menuInterest.delete({ where: { id: data.id } });
    return { ok: true as const };
  });
