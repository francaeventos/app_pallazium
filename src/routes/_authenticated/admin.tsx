import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { AppShell, type NavItem } from "@/components/AppShell";
import {
  Calendar,
  GalleryHorizontalEnd,
  Images,
  LayoutDashboard,
  Lightbulb,
  ListChecks,
  Bell,
  MailCheck,
  Sparkles,
  UtensilsCrossed,
  Shield,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({ component: Layout });

const nav: NavItem[] = [
  { to: "/admin", label: "Visão geral", icon: LayoutDashboard },
  { to: "/admin/clientes", label: "Clientes", icon: Users },
  { to: "/admin/eventos", label: "Eventos", icon: Calendar },
  { to: "/admin/convites", label: "Convites", icon: MailCheck },
  { to: "/admin/checklist", label: "Checklists", icon: ListChecks },
  { to: "/admin/cardapios", label: "Cardápios", icon: UtensilsCrossed },
  { to: "/admin/upgrades", label: "Upgrades", icon: Sparkles },
  { to: "/admin/interesses", label: "Interesses", icon: Sparkles },
  { to: "/admin/referencias", label: "Referências", icon: Images },
  { to: "/admin/parceiros", label: "Parceiros", icon: Users },
  { to: "/admin/dicas", label: "Dicas", icon: Lightbulb },
  { to: "/admin/portfolio", label: "Portfólio", icon: GalleryHorizontalEnd },
  { to: "/admin/notificacoes", label: "Notificações", icon: Bell },
  { to: "/admin/acessos", label: "Acessos", icon: Shield },
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
