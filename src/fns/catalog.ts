import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/integrations/auth/auth-middleware";
import { toDateString, toIsoString } from "@/lib/api-map";
import { db } from "@/lib/db";

export type TipRow = {
  id: string;
  title: string;
  category: string;
  content: string;
  image_url: string | null;
  active: boolean;
  created_at: string;
};

export type PortfolioRow = {
  id: string;
  event_name: string;
  event_type: string;
  category: string;
  description: string | null;
  highlights: string | null;
  images: string[];
  active: boolean;
  created_at: string;
};

export type PartnerRow = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  website_url: string | null;
  image_url: string | null;
  logo_url: string | null;
  gallery_urls: string[];
  active: boolean;
  created_at: string;
};

export type ReferenceRow = {
  id: string;
  event_id: string;
  title: string;
  category: string;
  image_url: string | null;
  inspiration_link: string | null;
  notes: string | null;
  created_at: string;
  events: {
    event_type: string;
    event_date: string | null;
    clients: { full_name: string } | null;
  } | null;
};

export type EbookRow = {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  file_url: string;
  file_name: string;
  file_size: number | null;
  created_at: string;
};

export const listActiveTipsFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async (): Promise<TipRow[]> => {
    const rows = await db.tip.findMany({
      where: { active: true },
      orderBy: { category: "asc" },
    });
    return rows.map((tip) => ({
      id: tip.id,
      title: tip.title,
      category: tip.category,
      content: tip.content,
      image_url: tip.imageUrl,
      active: tip.active,
      created_at: toIsoString(tip.createdAt)!,
    }));
  });

export const listActivePortfolioFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async (): Promise<PortfolioRow[]> => {
    const rows = await db.portfolioItem.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((item) => ({
      id: item.id,
      event_name: item.eventName,
      event_type: item.eventType,
      category: item.category,
      description: item.description,
      highlights: item.highlights,
      images: item.images,
      active: item.active,
      created_at: toIsoString(item.createdAt)!,
    }));
  });

export const listActivePartnersFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async (): Promise<PartnerRow[]> => {
    const rows = await db.partner.findMany({
      where: { active: true },
      orderBy: { category: "asc" },
    });
    return rows.map((partner) => ({
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
    }));
  });

export const listEventReferencesFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async (): Promise<ReferenceRow[]> => {
    const rows = await db.eventReference.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        event: {
          select: {
            eventType: true,
            eventDate: true,
            client: { select: { fullName: true } },
          },
        },
      },
    });
    return rows.map((ref) => ({
      id: ref.id,
      event_id: ref.eventId,
      title: ref.title,
      category: ref.category,
      image_url: ref.imageUrl,
      inspiration_link: ref.inspirationLink,
      notes: ref.notes,
      created_at: toIsoString(ref.createdAt)!,
      events: ref.event
        ? {
            event_type: ref.event.eventType,
            event_date: toDateString(ref.event.eventDate),
            clients: ref.event.client ? { full_name: ref.event.client.fullName } : null,
          }
        : null,
    }));
  });

export const listActiveEbooksFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async (): Promise<EbookRow[]> => {
    const rows = await db.ebook.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((ebook) => ({
      id: ebook.id,
      title: ebook.title,
      description: ebook.description,
      cover_url: ebook.coverUrl,
      file_url: ebook.fileUrl,
      file_name: ebook.fileName,
      file_size: ebook.fileSize != null ? Number(ebook.fileSize) : null,
      created_at: toIsoString(ebook.createdAt)!,
    }));
  });
