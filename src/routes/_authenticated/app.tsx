import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { AppShell, type NavItem } from "@/components/AppShell";
import {
  BookOpen,
  LayoutDashboard,
  ListChecks,
  AlertCircle,
  UtensilsCrossed,
  Sparkles,
  Images,
  Users,
  Lightbulb,
  GalleryHorizontalEnd,
  MailCheck,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/app")({ component: Layout });

const nav: NavItem[] = [
  { to: "/app", label: "Painel", icon: LayoutDashboard },
  { to: "/app/checklist", label: "Checklist", icon: ListChecks },
  { to: "/app/pendencias", label: "Pendências", icon: AlertCircle },
  { to: "/app/convites", label: "Convites", icon: MailCheck },
  { to: "/app/cardapios", label: "Cardápios", icon: UtensilsCrossed },
  { to: "/app/upgrades", label: "Upgrades", icon: Sparkles },
  { to: "/app/referencias", label: "Referências", icon: Images },
  { to: "/app/parceiros", label: "Parceiros", icon: Users },
  { to: "/app/dicas", label: "Dicas", icon: Lightbulb },
  { to: "/app/ebook", label: "Ebooks", icon: BookOpen },
  { to: "/app/portfolio", label: "Portfólio", icon: GalleryHorizontalEnd },
];

function Layout() {
  const { role, loading } = useAuth();
  if (loading) return null;
  if (role === "admin") return <Navigate to="/admin" />;
  return (
    <AppShell title="Área VIP" nav={nav}>
      <Outlet />
    </AppShell>
  );
}
