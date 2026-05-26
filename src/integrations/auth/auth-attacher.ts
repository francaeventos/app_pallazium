import { createMiddleware } from "@tanstack/react-start";
import { getStoredAuthToken } from "@/fns/auth";

export const attachAuth = createMiddleware({ type: "function" }).client(async ({ next }) => {
  const token = getStoredAuthToken();
  return next({
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
});
