import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/integrations/auth/auth-middleware";
import { assertAdmin } from "@/lib/auth-session";

async function guardAdmin(context: { userId?: string }) {
  const userId = context.userId;
  if (!userId) throw new Error("Sessão inválida.");
  await assertAdmin(userId);
}

const STATUS_VALUES = ["novo", "em_analise", "contatado", "descartado"] as const;

function applicationRecord(app: {
  id: string;
  contactName: string;
  whatsapp: string;
  email: string;
  companyName: string;
  website: string | null;
  instagram: string | null;
  partnershipType: string;
  description: string;
  status: string;
  notes: string | null;
  sourceUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: app.id,
    contact_name: app.contactName,
    whatsapp: app.whatsapp,
    email: app.email,
    company_name: app.companyName,
    website: app.website,
    instagram: app.instagram,
    partnership_type: app.partnershipType,
    description: app.description,
    status: app.status,
    notes: app.notes,
    source_url: app.sourceUrl,
    created_at: app.createdAt.toISOString(),
    updated_at: app.updatedAt.toISOString(),
  };
}

export const listPartnerApplicationsFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((data) =>
    z
      .object({
        status: z.enum(STATUS_VALUES).optional(),
        q: z.string().optional(),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    await guardAdmin(context);
    const applications = await db.partnerApplication.findMany({
      where: {
        ...(data.status ? { status: data.status } : {}),
        ...(data.q
          ? {
              OR: [
                { contactName: { contains: data.q, mode: "insensitive" } },
                { companyName: { contains: data.q, mode: "insensitive" } },
                { email: { contains: data.q, mode: "insensitive" } },
                { whatsapp: { contains: data.q.replace(/\D/g, "") } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    return { applications: applications.map(applicationRecord) };
  });

export const updatePartnerApplicationFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(STATUS_VALUES).optional(),
        notes: z.string().max(5000).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await guardAdmin(context);
    const app = await db.partnerApplication.update({
      where: { id: data.id },
      data: {
        ...(data.status ? { status: data.status } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
    });
    return { application: applicationRecord(app) };
  });

export const deletePartnerApplicationsFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => z.object({ ids: z.array(z.string().uuid()).min(1) }).parse(data))
  .handler(async ({ data, context }) => {
    await guardAdmin(context);
    const result = await db.partnerApplication.deleteMany({ where: { id: { in: data.ids } } });
    return { ok: true as const, count: result.count };
  });
