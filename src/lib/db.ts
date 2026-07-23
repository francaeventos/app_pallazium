import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL não configurada.");
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

function getDb() {
  const existing = globalForPrisma.prisma;
  // Evita singleton stale após prisma generate (ex.: leadForm undefined)
  const leadForm = existing ? (existing as { leadForm?: { findFirst?: unknown } }).leadForm : undefined;
  if (existing && typeof leadForm?.findFirst === "function") {
    return existing;
  }
  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  return client;
}

export const db = getDb();
