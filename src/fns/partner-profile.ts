import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/integrations/auth/auth-middleware";
import { partnerRecord } from "@/lib/admin-records";

export const getOwnPartnerFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const partner = await db.partner.findFirst({ where: { userId: context.userId } });
    return { partner: partner ? partnerRecord(partner) : null };
  });

const updateOwnPartnerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(80),
  description: z.string().trim().max(2000).nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  whatsapp: z.string().trim().max(30).nullable().optional(),
  instagram: z.string().trim().max(200).nullable().optional(),
  website_url: z.string().trim().max(300).nullable().optional(),
  image_url: z.string().trim().max(2000).nullable().optional(),
  logo_url: z.string().trim().max(2000).nullable().optional(),
  gallery_urls: z.array(z.string().trim().max(2000)).max(4).optional(),
});

export const updateOwnPartnerFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => updateOwnPartnerSchema.parse(data))
  .handler(async ({ data, context }) => {
    const existing = await db.partner.findFirst({ where: { userId: context.userId } });
    if (!existing) throw new Error("Nenhum parceiro vinculado à sua conta.");

    const row = await db.partner.update({
      where: { id: existing.id },
      data: {
        name: data.name,
        category: data.category,
        description: data.description || null,
        phone: data.phone || null,
        whatsapp: data.whatsapp || null,
        instagram: data.instagram || null,
        websiteUrl: data.website_url || null,
        imageUrl: data.image_url || null,
        logoUrl: data.logo_url || null,
        galleryUrls: (data.gallery_urls ?? []).slice(0, 4),
      },
    });

    return partnerRecord(row);
  });
