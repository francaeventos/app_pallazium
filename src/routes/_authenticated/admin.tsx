import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { AppShell, type NavItem } from "@/components/AppShell";
import { LayoutDashboard, Users, Calendar, ListChecks, Sparkles, UtensilsCrossed } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({ component: Layout });

const nav: NavItem[] = [
  { to: "/admin", label: "Visão geral", icon: LayoutDashboard },
  { to: "/admin/clientes", label: "Clientes", icon: Users },
  { to: "/admin/eventos", label: "Eventos", icon: Calendar },
  { to: "/admin/checklist", label: "Checklists", icon: ListChecks },
  { to: "/admin/cardapios", label: "Cardápios", icon: UtensilsCrossed },
  { to: "/admin/upgrades", label: "Upgrades", icon: Sparkles },
  { to: "/admin/interesses", label: "Interesses", icon: Sparkles },
];

function Layout() {
  const { role, loading } = useAuth();
  if (loading) return null;
  if (role !== "admin") return <Navigate to="/app" />;
  return (
    <AppShell title="Painel Pallazium" nav={nav}>
      <Outlet />
    </AppShell>
  );
}
