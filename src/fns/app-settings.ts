import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/integrations/auth/auth-middleware";
import { assertAdmin } from "@/lib/auth-session";
import { CLIENT_MENU_ITEMS } from "@/lib/client-menu";

async function getOrCreateSettings() {
  const existing = await db.appSettings.findUnique({ where: { id: "default" } });
  if (existing) return existing;
  return db.appSettings.create({ data: { id: "default" } });
}

export const getClientMenuVisibilityFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async () => {
    const settings = await getOrCreateSettings();
    return {
      visibility: (settings.clientMenuVisibility as Record<string, boolean>) ?? {},
    };
  });

const updateSchema = z.object({
  visibility: z.record(z.string(), z.boolean()),
});

export const updateClientMenuVisibilityFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => updateSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const allowedKeys = new Set(CLIENT_MENU_ITEMS.map((item) => item.key));
    const visibility: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(data.visibility)) {
      if (allowedKeys.has(key as (typeof CLIENT_MENU_ITEMS)[number]["key"])) {
        visibility[key] = value;
      }
    }

    await db.appSettings.upsert({
      where: { id: "default" },
      create: { id: "default", clientMenuVisibility: visibility },
      update: { clientMenuVisibility: visibility },
    });

    return { ok: true as const };
  });
