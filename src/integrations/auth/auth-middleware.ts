import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { resolveSession, type SessionUser } from "@/lib/auth-session";

export const requireAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const request = getRequest();
  const authHeader = request?.headers?.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized: No authorization header provided");
  }

  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) throw new Error("Unauthorized: No token provided");

  const user = await resolveSession(token);
  if (!user) throw new Error("Unauthorized: Invalid token");

  return next({
    context: {
      userId: user.id,
      user,
    },
  });
});

export type AuthContext = {
  userId: string;
  user: SessionUser;
};
