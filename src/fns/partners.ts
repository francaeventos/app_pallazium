import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { requireAuth } from "@/integrations/auth/auth-middleware";
import { clientOwnsEvent, getClientForUser } from "@/lib/auth-session";
import { toIsoString } from "@/lib/api-map";
import { db } from "@/lib/db";
import type { PartnerRow } from "@/fns/catalog";

export type PartnerDetail = PartnerRow & {
  interest_status: string | null;
};

function mapPartnerDetail(
  partner: {
    id: string;
    name: string;
    category: string;
    description: string | null;
    phone: string | null;
    whatsapp: string | null;
    instagram: string | null;
    websiteUrl: string | null;
    imageUrl: string | null;
    logoUrl: string | null;
    galleryUrls: string[];
    active: boolean;
    createdAt: Date;
  },
  interestStatus: string | null,
): PartnerDetail {
  return {
    id: partner.id,
    name: partner.name,
    category: partner.category,
    description: partner.description,
    phone: partner.phone,
    whatsapp: partner.whatsapp,
    instagram: partner.instagram,
    website_url: partner.websiteUrl,
    image_url: partner.imageUrl,
    logo_url: partner.logoUrl,
    gallery_urls: partner.galleryUrls,
    active: partner.active,
    created_at: toIsoString(partner.createdAt)!,
    interest_status: interestStatus,
  };
}

export const getPartnerDetailFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((data) => z.object({ partnerId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const partner = await db.partner.findFirst({
      where: { id: data.partnerId, active: true },
    });
    if (!partner) throw new Error("Parceiro não encontrado.");

    let interestStatus: string | null = null;
    const client = await getClientForUser(context.userId);
    if (client) {
      const event = await db.event.findFirst({
        where: { clientId: client.id, status: { not: "cancelado" } },
        orderBy: { eventDate: "asc" },
      });
      if (event) {
        const interest = await db.partnerInterest.findFirst({
          where: { clientId: client.id, eventId: event.id, partnerId: partner.id },
          select: { status: true },
        });
        interestStatus = interest?.status ?? null;
      }
    }

    return { partner: mapPartnerDetail(partner, interestStatus) };
  });

const registerPartnerInterestInput = z.object({
  partnerId: z.string().uuid(),
  eventId: z.string().uuid(),
});

export const registerPartnerInterestFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => registerPartnerInterestInput.parse(data))
  .handler(async ({ data, context }) => {
    const client = await getClientForUser(context.userId);
    if (!client) throw new Error("Evento não vinculado.");

    const owns = await clientOwnsEvent(context.userId, data.eventId);
    if (!owns) throw new Error("Acesso negado.");

    const partner = await db.partner.findFirst({
      where: { id: data.partnerId, active: true },
    });
    if (!partner) throw new Error("Parceiro não encontrado.");

    try {
      await db.partnerInterest.create({
        data: {
          partnerId: data.partnerId,
          clientId: client.id,
          eventId: data.eventId,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new Error("DUPLICATE");
      }
      throw error;
    }

    const notifyTitle = "Novo interesse em parceiro";
    const notifyMessage = `${client.fullName} demonstrou interesse em ${partner.name}.`;

    const admins = await db.userRole.findMany({
      where: { role: "admin" },
      select: { userId: true },
    });

    await db.notification.createMany({
      data: [
        ...admins.map((admin) => ({
          userId: admin.userId,
          title: notifyTitle,
          message: notifyMessage,
        })),
        ...(partner.userId
          ? [
              {
                userId: partner.userId,
                title: "Você recebeu um novo interesse!",
                message: `${client.fullName} tem interesse no seu negócio. A equipe Espaço Pallazium vai fazer a ponte.`,
              },
            ]
          : []),
      ],
    });

    return { ok: true as const };
  });
