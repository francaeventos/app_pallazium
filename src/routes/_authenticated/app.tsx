import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { AppShell, type NavItem } from "@/components/AppShell";
import { getClientMenuVisibilityFn } from "@/fns/app-settings";
import { CLIENT_MENU_ITEMS, isClientMenuItemVisible } from "@/lib/client-menu";
import { LayoutDashboard } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app")({ component: Layout });

const painelItem: NavItem = { to: "/app", label: "Painel", icon: LayoutDashboard };

function Layout() {
  const { role, loading } = useAuth();
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});

  useEffect(() => {
    getClientMenuVisibilityFn()
      .then(({ visibility }) => setVisibility(visibility))
      .catch(() => {});
  }, []);

  if (loading) return null;
  if (role === "admin") return <Navigate to="/admin" />;
  if (role === "parceiro") return <Navigate to="/parceiro" />;

  const nav: NavItem[] = [
    painelItem,
    ...CLIENT_MENU_ITEMS.filter((item) => isClientMenuItemVisible(visibility, item.key)),
  ];

  return (
    <AppShell title="Área VIP" nav={nav}>
      <Outlet />
    </AppShell>
  );
}
