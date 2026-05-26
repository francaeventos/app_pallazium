import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/integrations/auth/auth-middleware";
import { assertAdmin } from "@/lib/auth-session";
import {
  ebookRecord,
  menuRecord,
  partnerRecord,
  portfolioRecord,
  tipRecord,
  upgradeRecord,
} from "@/lib/admin-records";

async function guardAdmin(context: { userId?: string }) {
  const userId = context.userId;
  if (!userId) throw new Error("Sessão inválida.");
  await assertAdmin(userId);
}

const idSchema = z.object({ id: z.string().uuid() });
const toggleSchema = z.object({ id: z.string().uuid(), active: z.boolean() });

const menuSaveSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1),
  category: z.string().trim().min(1),
  description: z.string().trim().optional(),
  items: z.string().trim().optional(),
  image_url: z.string().trim().optional(),
  images: z.array(z.string()).optional(),
  notes: z.string().trim().optional(),
  active: z.boolean().default(true),
});

const upgradeSaveSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1),
  category: z.string().trim().min(1),
  description: z.string().trim().optional(),
  price_text: z.string().trim().optional(),
  image_url: z.string().trim().optional(),
  active: z.boolean().default(true),
});

const partnerSaveSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1),
  category: z.string().trim().min(1),
  description: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  whatsapp: z.string().trim().optional(),
  instagram: z.string().trim().optional(),
  image_url: z.string().trim().optional(),
  active: z.boolean().default(true),
});

const tipSaveSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1),
  category: z.string().trim().min(1),
  content: z.string().trim().min(1),
  image_url: z.string().trim().optional(),
  active: z.boolean().default(true),
});

const portfolioSaveSchema = z.object({
  id: z.string().uuid().optional(),
  event_name: z.string().trim().min(1),
  event_type: z.string().trim().min(1),
  category: z.string().trim().min(1),
  description: z.string().trim().optional(),
  highlights: z.string().trim().optional(),
  images: z.array(z.string()).optional(),
  active: z.boolean().default(true),
});

export const listMenusFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await guardAdmin(context);
    const rows = await db.menu.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map(menuRecord);
  });

export const saveMenuFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => menuSaveSchema.parse(data))
  .handler(async ({ data, context }) => {
    await guardAdmin(context);
    const images = data.images ?? [];
    const payload = {
      name: data.name,
      category: data.category,
      description: data.description || null,
      items: data.items || null,
      imageUrl: data.image_url || images[0] || null,
      images,
      notes: data.notes || null,
      active: data.active,
    };

    const row = data.id
      ? await db.menu.update({ where: { id: data.id }, data: payload })
      : await db.menu.create({ data: payload });

    return menuRecord(row);
  });

export const deleteMenuFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => idSchema.parse(data))
  .handler(async ({ data, context }) => {
    await guardAdmin(context);
    await db.menu.delete({ where: { id: data.id } });
    return { ok: true as const };
  });

export const toggleMenuFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => toggleSchema.parse(data))
  .handler(async ({ data, context }) => {
    await guardAdmin(context);
    const row = await db.menu.update({
      where: { id: data.id },
      data: { active: data.active },
    });
    return menuRecord(row);
  });

export const listUpgradesFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await guardAdmin(context);
    const rows = await db.upgrade.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map(upgradeRecord);
  });

export const saveUpgradeFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => upgradeSaveSchema.parse(data))
  .handler(async ({ data, context }) => {
    await guardAdmin(context);
    const payload = {
      name: data.name,
      category: data.category,
      description: data.description || null,
      priceText: data.price_text || null,
      imageUrl: data.image_url || null,
      active: data.active,
    };

    const row = data.id
      ? await db.upgrade.update({ where: { id: data.id }, data: payload })
      : await db.upgrade.create({ data: payload });

    return upgradeRecord(row);
  });

export const deleteUpgradeFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => idSchema.parse(data))
  .handler(async ({ data, context }) => {
    await guardAdmin(context);
    await db.upgrade.delete({ where: { id: data.id } });
    return { ok: true as const };
  });

export const toggleUpgradeFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => toggleSchema.parse(data))
  .handler(async ({ data, context }) => {
    await guardAdmin(context);
    const row = await db.upgrade.update({
      where: { id: data.id },
      data: { active: data.active },
    });
    return upgradeRecord(row);
  });

export const listPartnersFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await guardAdmin(context);
    const rows = await db.partner.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map(partnerRecord);
  });

export const savePartnerFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => partnerSaveSchema.parse(data))
  .handler(async ({ data, context }) => {
    await guardAdmin(context);
    const payload = {
      name: data.name,
      category: data.category,
      description: data.description || null,
      phone: data.phone || null,
      whatsapp: data.whatsapp || null,
      instagram: data.instagram || null,
      imageUrl: data.image_url || null,
      active: data.active,
    };

    const row = data.id
      ? await db.partner.update({ where: { id: data.id }, data: payload })
      : await db.partner.create({ data: payload });

    return partnerRecord(row);
  });

export const deletePartnerFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => idSchema.parse(data))
  .handler(async ({ data, context }) => {
    await guardAdmin(context);
    await db.partner.delete({ where: { id: data.id } });
    return { ok: true as const };
  });

export const togglePartnerFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => toggleSchema.parse(data))
  .handler(async ({ data, context }) => {
    await guardAdmin(context);
    const row = await db.partner.update({
      where: { id: data.id },
      data: { active: data.active },
    });
    return partnerRecord(row);
  });

export const listTipsFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await guardAdmin(context);
    const rows = await db.tip.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map(tipRecord);
  });

export const saveTipFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => tipSaveSchema.parse(data))
  .handler(async ({ data, context }) => {
    await guardAdmin(context);
    const payload = {
      title: data.title,
      category: data.category,
      content: data.content,
      imageUrl: data.image_url || null,
      active: data.active,
    };

    const row = data.id
      ? await db.tip.update({ where: { id: data.id }, data: payload })
      : await db.tip.create({ data: payload });

    return tipRecord(row);
  });

export const deleteTipFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => idSchema.parse(data))
  .handler(async ({ data, context }) => {
    await guardAdmin(context);
    await db.tip.delete({ where: { id: data.id } });
    return { ok: true as const };
  });

export const toggleTipFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => toggleSchema.parse(data))
  .handler(async ({ data, context }) => {
    await guardAdmin(context);
    const row = await db.tip.update({
      where: { id: data.id },
      data: { active: data.active },
    });
    return tipRecord(row);
  });

export const listPortfolioFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await guardAdmin(context);
    const rows = await db.portfolioItem.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map(portfolioRecord);
  });

export const savePortfolioFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => portfolioSaveSchema.parse(data))
  .handler(async ({ data, context }) => {
    await guardAdmin(context);
    const payload = {
      eventName: data.event_name,
      eventType: data.event_type,
      category: data.category,
      description: data.description || null,
      highlights: data.highlights || null,
      images: data.images ?? [],
      active: data.active,
    };

    const row = data.id
      ? await db.portfolioItem.update({ where: { id: data.id }, data: payload })
      : await db.portfolioItem.create({ data: payload });

    return portfolioRecord(row);
  });

export const deletePortfolioFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => idSchema.parse(data))
  .handler(async ({ data, context }) => {
    await guardAdmin(context);
    await db.portfolioItem.delete({ where: { id: data.id } });
    return { ok: true as const };
  });

export const togglePortfolioFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => toggleSchema.parse(data))
  .handler(async ({ data, context }) => {
    await guardAdmin(context);
    const row = await db.portfolioItem.update({
      where: { id: data.id },
      data: { active: data.active },
    });
    return portfolioRecord(row);
  });

export const listEbooksFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await guardAdmin(context);
    const rows = await db.ebook.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map(ebookRecord);
  });

export const toggleEbookFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => toggleSchema.parse(data))
  .handler(async ({ data, context }) => {
    await guardAdmin(context);
    const row = await db.ebook.update({
      where: { id: data.id },
      data: { active: data.active },
    });
    return ebookRecord(row);
  });

export const deleteEbookFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => idSchema.parse(data))
  .handler(async ({ data, context }) => {
    await guardAdmin(context);
    await db.ebook.delete({ where: { id: data.id } });
    return { ok: true as const };
  });
