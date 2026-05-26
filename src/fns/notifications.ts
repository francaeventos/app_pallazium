import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/integrations/auth/auth-middleware";
import { db } from "@/lib/db";

export type NotificationRow = {
  id: string;
  user_id: string;
  title: string;
  message: string | null;
  read: boolean;
  created_at: string;
};

function formatNotification(row: {
  id: string;
  userId: string;
  title: string;
  message: string | null;
  read: boolean;
  createdAt: Date;
}): NotificationRow {
  return {
    id: row.id,
    user_id: row.userId,
    title: row.title,
    message: row.message,
    read: row.read,
    created_at: row.createdAt.toISOString(),
  };
}

export const listNotificationsFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const rows = await db.notification.findMany({
      where: { userId: context.userId },
      orderBy: { createdAt: "desc" },
      take: 8,
    });
    return rows.map(formatNotification);
  });

export const markNotificationReadFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const updated = await db.notification.updateMany({
      where: { id: data.id, userId: context.userId },
      data: { read: true },
    });
    if (updated.count === 0) throw new Error("Notificação não encontrada.");
    return { ok: true as const };
  });
