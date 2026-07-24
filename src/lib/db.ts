import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { LeadQuestionType } from "@/generated/prisma/enums";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaEnumFingerprint?: string;
};

/** Quando o enum muda (ex.: redirect/media), o singleton HMR precisa ser recriado. */
const ENUM_FINGERPRINT = Object.values(LeadQuestionType).sort().join(",");

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
  const leadForm = existing
    ? (existing as { leadForm?: { findFirst?: unknown } }).leadForm
    : undefined;
  const fingerprintOk = globalForPrisma.prismaEnumFingerprint === ENUM_FINGERPRINT;
  if (existing && fingerprintOk && typeof leadForm?.findFirst === "function") {
    return existing;
  }
  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
    globalForPrisma.prismaEnumFingerprint = ENUM_FINGERPRINT;
  }
  return client;
}

export const db = getDb();
