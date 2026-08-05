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
  fullName: string;
  whatsapp: string;
  email: string;
  city: string;
  birthDate: Date | null;
  roleInterest: string;
  hasExperience: boolean;
  experienceDetails: string | null;
  availability: string[];
  additionalInfo: string | null;
  status: string;
  notes: string | null;
  sourceUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: app.id,
    full_name: app.fullName,
    whatsapp: app.whatsapp,
    email: app.email,
    city: app.city,
    birth_date: app.birthDate?.toISOString() ?? null,
    role_interest: app.roleInterest,
    has_experience: app.hasExperience,
    experience_details: app.experienceDetails,
    availability: app.availability,
    additional_info: app.additionalInfo,
    status: app.status,
    notes: app.notes,
    source_url: app.sourceUrl,
    created_at: app.createdAt.toISOString(),
    updated_at: app.updatedAt.toISOString(),
  };
}

export const listJobApplicationsFn = createServerFn({ method: "GET" })
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
    const applications = await db.jobApplication.findMany({
      where: {
        ...(data.status ? { status: data.status } : {}),
        ...(data.q
          ? {
              OR: [
                { fullName: { contains: data.q, mode: "insensitive" } },
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

export const updateJobApplicationFn = createServerFn({ method: "POST" })
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
    const app = await db.jobApplication.update({
      where: { id: data.id },
      data: {
        ...(data.status ? { status: data.status } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
    });
    return { application: applicationRecord(app) };
  });

export const deleteJobApplicationsFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => z.object({ ids: z.array(z.string().uuid()).min(1) }).parse(data))
  .handler(async ({ data, context }) => {
    await guardAdmin(context);
    const result = await db.jobApplication.deleteMany({ where: { id: { in: data.ids } } });
    return { ok: true as const, count: result.count };
  });
