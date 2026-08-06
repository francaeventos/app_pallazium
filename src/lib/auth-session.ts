import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export type AppRole = "admin" | "client" | "parceiro";

export interface SessionUser {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: AppRole;
}

export function createSessionToken() {
  return randomBytes(32).toString("hex");
}

export async function createSession(userId: string) {
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.session.create({
    data: { userId, token, expiresAt },
  });

  return { token, expiresAt };
}

export async function deleteSession(token: string) {
  await db.session.deleteMany({ where: { token } });
}

export async function resolveSession(token: string): Promise<SessionUser | null> {
  const session = await db.session.findUnique({
    where: { token },
    include: {
      user: {
        include: {
          profile: true,
          roles: true,
        },
      },
    },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) await db.session.delete({ where: { id: session.id } });
    return null;
  }

  const roles = session.user.roles.map((item) => item.role);
  const role: AppRole = roles.includes("admin")
    ? "admin"
    : roles.includes("parceiro")
      ? "parceiro"
      : "client";

  return {
    id: session.user.id,
    email: session.user.email,
    fullName: session.user.profile?.fullName ?? null,
    avatarUrl: session.user.profile?.avatarUrl ?? null,
    role,
  };
}

export async function getUserRole(userId: string): Promise<AppRole> {
  const roles = await db.userRole.findMany({ where: { userId } });
  const values = roles.map((item) => item.role);
  if (values.includes("admin")) return "admin";
  if (values.includes("parceiro")) return "parceiro";
  return "client";
}

export async function assertAdmin(userId: string) {
  const role = await getUserRole(userId);
  if (role !== "admin") {
    throw new Error("Acesso restrito a administradores.");
  }
}

export async function clientOwnsEvent(userId: string, eventId: string) {
  const event = await db.event.findFirst({
    where: {
      id: eventId,
      client: { userId },
    },
    select: { id: true },
  });
  return Boolean(event);
}

export async function getClientForUser(userId: string) {
  return db.client.findFirst({ where: { userId } });
}

export async function getPartnerForUser(userId: string) {
  return db.partner.findFirst({ where: { userId } });
}
