import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth-session";

const SALT_ROUNDS = 12;

/** Sem caracteres ambíguos (0/O, 1/l/I) para facilitar leitura e digitação. */
const TEMP_PASSWORD_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

export function generateTempPassword(length = 10) {
  let password = "";
  for (let i = 0; i < length; i++) {
    password += TEMP_PASSWORD_CHARS[randomInt(TEMP_PASSWORD_CHARS.length)];
  }
  return password;
}

export async function registerUser(input: {
  email: string;
  password: string;
  fullName: string;
}) {
  const email = input.email.trim().toLowerCase();
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) throw new Error("Este e-mail já está cadastrado.");

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await db.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email,
        passwordHash,
      },
    });

    await tx.profile.create({
      data: {
        id: created.id,
        fullName: input.fullName.trim(),
        email,
      },
    });

    await tx.userRole.create({
      data: { userId: created.id, role: "client" },
    });

    await tx.client.updateMany({
      where: {
        userId: null,
        email: { equals: email, mode: "insensitive" },
      },
      data: { userId: created.id },
    });

    const linkedPartner = await tx.partner.updateMany({
      where: {
        userId: null,
        email: { equals: email, mode: "insensitive" },
      },
      data: { userId: created.id },
    });
    if (linkedPartner.count > 0) {
      await tx.userRole.create({
        data: { userId: created.id, role: "parceiro" },
      });
    }

    return created;
  });

  return createSession(user.id);
}

export async function loginUser(input: { email: string; password: string }) {
  const email = input.email.trim().toLowerCase();
  const user = await db.user.findUnique({ where: { email } });
  if (!user) throw new Error("E-mail ou senha incorretos.");

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) throw new Error("E-mail ou senha incorretos.");

  return createSession(user.id);
}

export async function updateUserPassword(userId: string, password: string) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  await db.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
}

export async function promoteUserToAdminByEmail(email: string) {
  const user = await db.user.findFirst({
    where: { email: { equals: email.trim(), mode: "insensitive" } },
  });
  if (!user) throw new Error(`Usuário não encontrado para o e-mail ${email}.`);

  await db.userRole.upsert({
    where: { userId_role: { userId: user.id, role: "admin" } },
    update: {},
    create: { userId: user.id, role: "admin" },
  });
}

export async function linkClientToUserByEmail(clientId: string) {
  const client = await db.client.findUnique({ where: { id: clientId } });
  if (!client) throw new Error("Cliente não encontrado.");

  const user = await db.user.findFirst({
    where: { email: { equals: client.email, mode: "insensitive" } },
  });
  if (!user) throw new Error("Nenhuma conta encontrada com o e-mail deste cliente.");

  await db.client.update({
    where: { id: clientId },
    data: { userId: user.id },
  });
}
