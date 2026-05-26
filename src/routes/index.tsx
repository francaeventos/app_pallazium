import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { isRecoveryUrl, markRecoveryMode } from "@/lib/password-recovery";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  const { loading, user, role } = useAuth();
  const [recoveryRedirecting, setRecoveryRedirecting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isRecoveryUrl()) return;

    markRecoveryMode();
    if (window.location.pathname === "/login") return;

    setRecoveryRedirecting(true);
    window.location.replace(`/login${window.location.search}${window.location.hash}`);
  }, []);

  if (recoveryRedirecting) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Carregando…
      </div>
    );
  }

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Carregando…
      </div>
    );
  if (!user) return <Navigate to="/login" />;
  if (isRecoveryUrl()) return <Navigate to="/login" />;
  if (role === "admin") return <Navigate to="/admin" />;
  return <Navigate to="/app" />;
}
