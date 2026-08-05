import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { normalizePhone, validateWhatsApp } from "@/lib/leads/phone";
import { calculateAgeFromIso, parseLeadDate } from "@/lib/leads/date";

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
  fullName: z.string().trim().min(3, "Informe seu nome completo.").max(150),
  whatsapp: z.string().trim().min(8, "Informe um WhatsApp válido."),
  email: z.string().trim().email("Informe um e-mail válido.").max(255),
  city: z.string().trim().min(2, "Informe sua cidade.").max(120),
  birthDate: z.string().trim().min(1, "Informe sua data de nascimento."),
  roleInterest: z.string().trim().min(1, "Escolha a função de interesse.").max(80),
  hasExperience: z.boolean(),
  experienceDetails: z.string().trim().max(2000).optional().or(z.literal("")),
  availability: z.array(z.string()).min(1, "Selecione ao menos uma disponibilidade."),
  additionalInfo: z.string().trim().max(2000).optional().or(z.literal("")),
  consent: z.boolean().refine((v) => v === true, {
    message: "É necessário autorizar o uso dos dados para continuar.",
  }),
  utm: utmSchema,
  sourceUrl: z.string().url().optional().or(z.literal("")).optional(),
});

export const submitJobApplicationFn = createServerFn({ method: "POST" })
  .inputValidator((data) => submitSchema.parse(data))
  .handler(async ({ data }) => {
    const phoneError = validateWhatsApp(data.whatsapp);
    if (phoneError) throw new Error(phoneError);
    const whatsapp = normalizePhone(data.whatsapp);

    if (data.hasExperience && !data.experienceDetails?.trim()) {
      throw new Error("Conte brevemente sobre sua experiência.");
    }

    const parsedBirthDate = parseLeadDate(data.birthDate.trim());
    if (!parsedBirthDate) throw new Error("Data de nascimento inválida. Use dd/mm/aaaa.");
    if (calculateAgeFromIso(parsedBirthDate.iso) < 18) {
      throw new Error("É necessário ter 18 anos ou mais para se candidatar.");
    }
    const birthDate = parsedBirthDate.date;

    const application = await db.jobApplication.create({
      data: {
        fullName: data.fullName.trim(),
        whatsapp,
        email: data.email.trim(),
        city: data.city.trim(),
        birthDate,
        roleInterest: data.roleInterest,
        hasExperience: data.hasExperience,
        experienceDetails: data.hasExperience ? data.experienceDetails?.trim() || null : null,
        availability: data.availability,
        additionalInfo: data.additionalInfo?.trim() || null,
        consent: true,
        sourceUrl: data.sourceUrl || null,
        utm: (data.utm ?? {}) as Prisma.InputJsonValue,
      },
    });

    return { id: application.id };
  });
