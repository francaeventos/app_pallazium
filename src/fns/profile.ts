import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/integrations/auth/auth-middleware";
import { db } from "@/lib/db";

const updateProfileSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  avatarUrl: z.string().trim().max(2000).nullable().optional(),
});

export const updateProfileFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => updateProfileSchema.parse(data))
  .handler(async ({ data, context }) => {
    const user = await db.user.findUnique({
      where: { id: context.userId },
      select: { email: true },
    });
    if (!user) throw new Error("Usuário não encontrado.");

    await db.profile.upsert({
      where: { id: context.userId },
      create: {
        id: context.userId,
        fullName: data.fullName,
        email: user.email,
        avatarUrl: data.avatarUrl?.trim() || null,
      },
      update: {
        fullName: data.fullName,
        email: user.email,
        avatarUrl: data.avatarUrl?.trim() || null,
      },
    });

    return {
      fullName: data.fullName,
      avatarUrl: data.avatarUrl?.trim() || null,
    };
  });
