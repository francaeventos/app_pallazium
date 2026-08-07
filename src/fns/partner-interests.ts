import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/integrations/auth/auth-middleware";
import { getPartnerForUser } from "@/lib/auth-session";

const interestStatusSchema = z.enum(["novo", "em_contato", "vendido", "perdido"]);

function mapOwnInterestRow(row: {
  id: string;
  status: string;
  notes: string | null;
  createdAt: Date;
  client: { fullName: string; email: string; whatsapp: string | null };
  event: { eventType: string; eventDate: Date | null };
}) {
  return {
    id: row.id,
    status: row.status,
    notes: row.notes,
    created_at: row.createdAt.toISOString(),
    client: {
      full_name: row.client.fullName,
      email: row.client.email,
      whatsapp: row.client.whatsapp,
    },
    event: {
      event_type: row.event.eventType,
      event_date: row.event.eventDate ? row.event.eventDate.toISOString().slice(0, 10) : null,
    },
  };
}

export const listOwnPartnerInterestsFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const partner = await getPartnerForUser(context.userId);
    if (!partner) return { interests: [] };

    const rows = await db.partnerInterest.findMany({
      where: { partnerId: partner.id, clientDataReleased: true },
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { fullName: true, email: true, whatsapp: true } },
        event: { select: { eventType: true, eventDate: true } },
      },
    });

    return { interests: rows.map(mapOwnInterestRow) };
  });

export const updateOwnPartnerInterestStatusFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) =>
    z.object({ id: z.string().uuid(), status: interestStatusSchema }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const partner = await getPartnerForUser(context.userId);
    if (!partner) throw new Error("Nenhum parceiro vinculado à sua conta.");

    const existing = await db.partnerInterest.findUnique({ where: { id: data.id } });
    if (!existing || existing.partnerId !== partner.id) {
      throw new Error("Interesse não encontrado.");
    }

    const row = await db.partnerInterest.update({
      where: { id: data.id },
      data: { status: data.status },
      include: {
        client: { select: { fullName: true, email: true, whatsapp: true } },
        event: { select: { eventType: true, eventDate: true } },
      },
    });

    const statusLabels: Record<string, string> = {
      novo: "Novo",
      em_contato: "Em contato",
      vendido: "Vendido",
      perdido: "Perdido",
    };
    const admins = await db.userRole.findMany({
      where: { role: "admin" },
      select: { userId: true },
    });
    await db.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.userId,
        title: "Status de interesse atualizado",
        message: `${partner.name} marcou o interesse de ${row.client.fullName} como "${
          statusLabels[data.status] ?? data.status
        }".`,
      })),
    });

    return mapOwnInterestRow(row);
  });
