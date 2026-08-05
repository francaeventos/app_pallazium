import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { normalizePhone, validateWhatsApp } from "@/lib/leads/phone";

const utmSchema = z
  .object({
    utm_source: z.string().optional(),
    utm_medium: z.string().optional(),
    utm_campaign: z.string().optional(),
    utm_term: z.string().optional(),
    utm_content: z.string().optional(),
    gclid: z.string().optional(),
    fbclid: z.string().optional(),
  })
  .passthrough()
  .default({});

const submitSchema = z.object({
  contactName: z.string().trim().min(3, "Informe seu nome.").max(150),
  whatsapp: z.string().trim().min(8, "Informe um WhatsApp válido."),
  email: z.string().trim().email("Informe um e-mail válido.").max(255),
  companyName: z.string().trim().min(2, "Informe o nome da empresa ou nome artístico.").max(150),
  website: z.string().trim().max(255).optional().or(z.literal("")),
  instagram: z.string().trim().max(120).optional().or(z.literal("")),
  partnershipType: z.string().trim().min(1, "Escolha o tipo de parceria.").max(120),
  description: z.string().trim().min(10, "Conte um pouco mais sobre a proposta.").max(2000),
  consent: z.boolean().refine((v) => v === true, {
    message: "É necessário autorizar o uso dos dados para continuar.",
  }),
  utm: utmSchema,
  sourceUrl: z.string().url().optional().or(z.literal("")).optional(),
});

export const submitPartnerApplicationFn = createServerFn({ method: "POST" })
  .inputValidator((data) => submitSchema.parse(data))
  .handler(async ({ data }) => {
    const phoneError = validateWhatsApp(data.whatsapp);
    if (phoneError) throw new Error(phoneError);
    const whatsapp = normalizePhone(data.whatsapp);

    const application = await db.partnerApplication.create({
      data: {
        contactName: data.contactName.trim(),
        whatsapp,
        email: data.email.trim(),
        companyName: data.companyName.trim(),
        website: data.website?.trim() || null,
        instagram: data.instagram?.trim() || null,
        partnershipType: data.partnershipType,
        description: data.description.trim(),
        consent: true,
        sourceUrl: data.sourceUrl || null,
        utm: (data.utm ?? {}) as Prisma.InputJsonValue,
      },
    });

    return { id: application.id };
  });
