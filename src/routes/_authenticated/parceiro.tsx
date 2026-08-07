import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { AppShell, type NavItem } from "@/components/AppShell";
import { Handshake, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/parceiro")({ component: Layout });

const nav: NavItem[] = [
  { to: "/parceiro", label: "Meu perfil", icon: Handshake },
  { to: "/parceiro/interesses", label: "Clientes com interesse", icon: Users },
];

function Layout() {
  const { role, loading } = useAuth();
  if (loading) return null;
  if (role === "admin") return <Navigate to="/admin" />;
  if (role !== "parceiro") return <Navigate to="/app" />;
  return (
    <AppShell title="Painel do Parceiro" nav={nav}>
      <Outlet />
    </AppShell>
  );
}
