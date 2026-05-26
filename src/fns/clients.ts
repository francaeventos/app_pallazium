import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/integrations/auth/auth-middleware";
import { linkClientToUserByEmail } from "@/lib/auth-server";
import { assertAdmin } from "@/lib/auth-session";
import { mapClientRow } from "@/lib/admin-mappers";
import { db } from "@/lib/db";
import type { ClientStatus } from "@/generated/prisma/enums";

const clientStatusSchema = z.enum(["ativo", "inativo", "evento_concluido"]);

const saveClientSchema = z.object({
  id: z.string().uuid().optional(),
  full_name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(30).nullable().optional(),
  whatsapp: z.string().trim().max(30).nullable().optional(),
  document: z.string().trim().max(30).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  status: clientStatusSchema.optional(),
});

export const listClientsFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const rows = await db.client.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map(mapClientRow);
  });

export const saveClientFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => saveClientSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const payload = {
      fullName: data.full_name,
      email: data.email,
      phone: data.phone ?? null,
      whatsapp: data.whatsapp ?? null,
      document: data.document ?? null,
      notes: data.notes ?? null,
      status: (data.status ?? "ativo") as ClientStatus,
    };

    const row = data.id
      ? await db.client.update({ where: { id: data.id }, data: payload })
      : await db.client.create({ data: payload });

    return mapClientRow(row);
  });

export const updateClientStatusFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) =>
    z.object({ id: z.string().uuid(), status: clientStatusSchema }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const row = await db.client.update({
      where: { id: data.id },
      data: { status: data.status as ClientStatus },
    });
    return mapClientRow(row);
  });

export const deleteClientFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await db.client.delete({ where: { id: data.id } });
    return { ok: true as const };
  });

export const linkClientToUserFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => z.object({ client_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await linkClientToUserByEmail(data.client_id);
    return { ok: true as const };
  });
