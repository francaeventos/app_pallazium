import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  deleteSession,
  resolveSession,
  type SessionUser,
} from "@/lib/auth-session";
import { loginUser, registerUser, updateUserPassword } from "@/lib/auth-server";
import { requireAuth } from "@/integrations/auth/auth-middleware";

const AUTH_TOKEN_KEY = "pallazium_auth_token";

export function getStoredAuthToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setStoredAuthToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  else window.localStorage.removeItem(AUTH_TOKEN_KEY);
}

const credentialsSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(72),
});

const signupSchema = credentialsSchema.extend({
  fullName: z.string().trim().min(2).max(120),
});

const passwordSchema = z.object({
  password: z.string().min(6).max(72),
});

export const loginFn = createServerFn({ method: "POST" })
  .inputValidator((data) => credentialsSchema.parse(data))
  .handler(async ({ data }) => {
    const session = await loginUser(data);
    const user = await resolveSession(session.token);
    if (!user) throw new Error("Não foi possível iniciar a sessão.");
    return { token: session.token, user };
  });

export const signupFn = createServerFn({ method: "POST" })
  .inputValidator((data) => signupSchema.parse(data))
  .handler(async ({ data }) => {
    const session = await registerUser(data);
    const user = await resolveSession(session.token);
    if (!user) throw new Error("Não foi possível criar a conta.");
    return { token: session.token, user };
  });

export const logoutFn = createServerFn({ method: "POST" })
  .inputValidator((data: { token?: string }) => data ?? {})
  .handler(async ({ data }) => {
    if (data.token) await deleteSession(data.token);
    return { ok: true as const };
  });

export const getSessionFn = createServerFn({ method: "GET" })
  .inputValidator((data: { token?: string }) => data ?? {})
  .handler(async ({ data }) => {
    if (!data.token) return { user: null as SessionUser | null };
    const user = await resolveSession(data.token);
    return { user };
  });

export const updatePasswordFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => passwordSchema.parse(data))
  .handler(async ({ data, context }) => {
    await updateUserPassword(context.userId, data.password);
    return { ok: true as const };
  });

export type AuthSessionResponse = Awaited<ReturnType<typeof getSessionFn>>;
