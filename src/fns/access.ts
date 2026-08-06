import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/integrations/auth/auth-middleware";
import { promoteUserToAdminByEmail } from "@/lib/auth-server";
import { assertAdmin } from "@/lib/auth-session";
import { mapProfileRow, mapUserRoleRow } from "@/lib/admin-mappers";
import { db } from "@/lib/db";
import type { AppRole } from "@/generated/prisma/enums";

const roleSchema = z.enum(["admin", "client", "parceiro"]);

export const listAccessRowsFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);

    const [profiles, roles, clients, partners] = await Promise.all([
      db.profile.findMany({ orderBy: { createdAt: "desc" } }),
      db.userRole.findMany(),
      db.client.findMany({
        where: { userId: { not: null } },
        select: { userId: true, fullName: true, email: true, status: true },
      }),
      db.partner.findMany({
        where: { userId: { not: null } },
        select: { userId: true, name: true, email: true, active: true },
      }),
    ]);

    const rolesByUser = new Map<string, ReturnType<typeof mapUserRoleRow>[]>();
    for (const role of roles) {
      const mapped = mapUserRoleRow(role);
      rolesByUser.set(role.userId, [...(rolesByUser.get(role.userId) ?? []), mapped]);
    }

    const clientByUser = new Map(
      clients
        .filter((c) => c.userId)
        .map((c) => [
          c.userId!,
          {
            user_id: c.userId,
            full_name: c.fullName,
            email: c.email,
            status: c.status,
          },
        ]),
    );

    const partnerByUser = new Map(
      partners
        .filter((p) => p.userId)
        .map((p) => [
          p.userId!,
          {
            user_id: p.userId,
            name: p.name,
            email: p.email,
            active: p.active,
          },
        ]),
    );

    return profiles.map((profile) => ({
      ...mapProfileRow(profile),
      roles: rolesByUser.get(profile.id) ?? [],
      client: clientByUser.get(profile.id) ?? null,
      partner: partnerByUser.get(profile.id) ?? null,
    }));
  });

export const addUserRoleFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) =>
    z.object({ user_id: z.string().uuid(), role: roleSchema }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await db.userRole.create({
      data: { userId: data.user_id, role: data.role as AppRole },
    });
    return { ok: true as const };
  });

export const removeUserRoleFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => z.object({ role_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await db.userRole.delete({ where: { id: data.role_id } });
    return { ok: true as const };
  });

export const promoteAdminByEmailFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => z.object({ email: z.string().trim().email() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await promoteUserToAdminByEmail(data.email);
    return { ok: true as const };
  });

export const linkClientToProfileFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => z.object({ user_id: z.string().uuid(), email: z.string().email() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const updated = await db.client.updateMany({
      where: {
        email: { equals: data.email, mode: "insensitive" },
        userId: null,
      },
      data: { userId: data.user_id },
    });
    if (updated.count === 0) {
      throw new Error("Nenhum cliente sem vínculo encontrado com este e-mail.");
    }
    return { ok: true as const };
  });

export const unlinkClientFromUserFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => z.object({ user_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await db.client.updateMany({
      where: { userId: data.user_id },
      data: { userId: null },
    });
    return { ok: true as const };
  });

export const linkPartnerToProfileFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => z.object({ user_id: z.string().uuid(), email: z.string().email() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const updated = await db.partner.updateMany({
      where: {
        email: { equals: data.email, mode: "insensitive" },
        userId: null,
      },
      data: { userId: data.user_id },
    });
    if (updated.count === 0) {
      throw new Error("Nenhum parceiro sem vínculo encontrado com este e-mail.");
    }
    await db.userRole.upsert({
      where: { userId_role: { userId: data.user_id, role: "parceiro" } },
      update: {},
      create: { userId: data.user_id, role: "parceiro" },
    });
    return { ok: true as const };
  });

export const unlinkPartnerFromUserFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => z.object({ user_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await db.partner.updateMany({
      where: { userId: data.user_id },
      data: { userId: null },
    });
    return { ok: true as const };
  });

export const updateAccessProfileFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid(),
        full_name: z.string().nullable().optional(),
        email: z.string().nullable().optional(),
        phone: z.string().nullable().optional(),
        whatsapp: z.string().nullable().optional(),
        document: z.string().nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const profile = await db.profile.update({
      where: { id: data.id },
      data: {
        fullName: data.full_name ?? null,
        email: data.email ?? null,
        phone: data.phone ?? null,
        whatsapp: data.whatsapp ?? null,
        document: data.document ?? null,
      },
    });
    return mapProfileRow(profile);
  });
