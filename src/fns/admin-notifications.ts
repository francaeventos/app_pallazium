import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/integrations/auth/auth-middleware";
import { assertAdmin } from "@/lib/auth-session";
import { clientOptionRecord, notificationRecord } from "@/lib/admin-records";

async function guardAdmin(context: { userId?: string }) {
  const userId = context.userId;
  if (!userId) throw new Error("Sessão inválida.");
  await assertAdmin(userId);
}

const idSchema = z.object({ id: z.string().uuid() });

const saveNotificationSchema = z.object({
  id: z.string().uuid().optional(),
  client_id: z.string().uuid(),
  title: z.string().trim().min(1).max(120),
  message: z.string().trim().max(1000).optional(),
  read: z.boolean().default(false),
});

export const listNotificationsAdminFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await guardAdmin(context);
    const [notifications, clients] = await Promise.all([
      db.notification.findMany({ orderBy: { createdAt: "desc" } }),
      db.client.findMany({
        select: { id: true, fullName: true, email: true, userId: true },
        orderBy: { fullName: "asc" },
      }),
    ]);

    return {
      notifications: notifications.map(notificationRecord),
      clients: clients.map(clientOptionRecord),
    };
  });

export const saveNotificationFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => saveNotificationSchema.parse(data))
  .handler(async ({ data, context }) => {
    await guardAdmin(context);

    const client = await db.client.findUnique({
      where: { id: data.client_id },
      select: { userId: true },
    });

    if (!client?.userId) {
      throw new Error("Este cliente ainda não está vinculado a uma conta de acesso.");
    }

    const payload = {
      userId: client.userId,
      title: data.title,
      message: data.message || null,
      read: data.read,
    };

    const row = data.id
      ? await db.notification.update({ where: { id: data.id }, data: payload })
      : await db.notification.create({ data: payload });

    return notificationRecord(row);
  });

export const deleteNotificationFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => idSchema.parse(data))
  .handler(async ({ data, context }) => {
    await guardAdmin(context);
    await db.notification.delete({ where: { id: data.id } });
    return { ok: true as const };
  });
