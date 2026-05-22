import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Bell,
  CheckCircle2,
  Headphones,
  Menu,
  LogOut,
  Moon,
  Pencil,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

type Notification = Database["public"]["Tables"]["notifications"]["Row"];

export function AppShell({
  title,
  nav,
  children,
}: {
  title: string;
  nav: NavItem[];
  children: ReactNode;
}) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileAvatar, setProfileAvatar] = useState("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("pallazium-theme") === "dark";
  });
  const [now, setNow] = useState<Date | null>(null);

  const isActive = (to: string) =>
    to === "/app" || to === "/admin" ? location.pathname === to : location.pathname.startsWith(to);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    window.localStorage.setItem("pallazium-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const loadNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(8);
    setNotifications(data ?? []);
  };

  useEffect(() => {
    loadNotifications();
  }, [user?.id]);

  const displayName =
    typeof user?.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name
      : (user?.email?.split("@")[0] ?? "Cliente");
  const avatarUrl =
    typeof user?.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null;
  const timeLabel = now
    ? now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : "--:--";
  const unreadCount = notifications.filter((item) => !item.read).length;
  const supportNumber = String(import.meta.env.VITE_WHATSAPP_SUPPORT ?? "").replace(/\D/g, "");
  const supportHref = supportNumber
    ? `https://wa.me/${supportNumber}`
    : "https://wa.me/5511999999999";

  useEffect(() => {
    setProfileName(displayName);
    setProfileAvatar(avatarUrl ?? "");
  }, [avatarUrl, displayName]);

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  const saveProfile = async () => {
    const fullName = profileName.trim();
    const avatar = profileAvatar.trim();
    if (!fullName) return toast.error("Informe seu nome.");

    setSavingProfile(true);
    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: fullName,
        avatar_url: avatar || null,
      },
    });
    if (!error && user) {
      await supabase.from("profiles").upsert({
        id: user.id,
        full_name: fullName,
        email: user.email ?? null,
      });
    }
    setSavingProfile(false);

    if (error) return toast.error(error.message);
    toast.success("Perfil atualizado.");
    setProfileOpen(false);
  };

  const markNotificationRead = async (id: string) => {
    const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
    if (error) return toast.error(error.message);
    setNotifications((items) =>
      items.map((item) => (item.id === id ? { ...item, read: true } : item)),
    );
  };

  const SideNav = () => (
    <div className="pallazium-sidebar flex h-full flex-col">
      <div className="pallazium-sidebar-brand border-b p-4">
        <div className="space-y-4">
          <div className="pallazium-logo-card rounded-lg border border-white/10 bg-black">
            <img
              src="/logo-pallazium.png"
              alt="Espaço Pallazium"
              className="block h-auto w-full object-contain"
            />
          </div>
        </div>
      </div>

      <div className="px-4 pb-2 pt-4">
        <p className="pallazium-sidebar-muted text-[10px] uppercase tracking-[0.28em]">{title}</p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
                active ? "pallazium-sidebar-link-active font-semibold" : "pallazium-sidebar-link"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="pallazium-sidebar-brand border-t p-4">
        <a
          href={supportHref}
          target="_blank"
          rel="noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-white/80 transition hover:border-gold hover:bg-white/10 hover:text-white"
        >
          <Headphones className="h-4 w-4" />
          Suporte
        </a>
      </div>
    </div>
  );

  const TopBar = () => (
    <header className="pallazium-topbar sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b px-4 lg:px-8">
      <div className="flex items-center gap-3">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-white/80 hover:bg-white/10 hover:text-white lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[82vw] max-w-72 p-0">
            <SideNav />
          </SheetContent>
        </Sheet>
        <img
          src="/logo-pallazium.png"
          alt="Espaço Pallazium"
          className="h-8 w-auto rounded bg-black px-1 lg:hidden"
        />
      </div>

      <div className="ml-auto flex items-center gap-3">
        <span className="hidden text-sm tabular-nums text-white/70 sm:inline">{timeLabel}</span>
        <div className="hidden h-5 w-px bg-white/15 sm:block" />
        <span className="hidden max-w-32 truncate text-sm font-medium text-white/90 sm:inline">
          {displayName}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setDarkMode((value) => !value)}
          aria-label={darkMode ? "Ativar modo claro" : "Ativar modo escuro"}
          title={darkMode ? "Modo claro" : "Modo escuro"}
          className="rounded-full text-white/80 hover:bg-white/10 hover:text-white"
        >
          {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="relative rounded-full text-white/80 hover:bg-white/10 hover:text-white"
              aria-label="Abrir notificações"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-gold ring-2 ring-sidebar" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] sm:w-80">
            <DropdownMenuLabel>Notificações</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length === 0 && (
              <div className="px-3 py-4 text-sm text-muted-foreground">
                Nenhuma notificação por enquanto.
              </div>
            )}
            {notifications.map((item) => (
              <DropdownMenuItem
                key={item.id}
                className="items-start gap-3"
                onSelect={(event) => event.preventDefault()}
              >
                <span
                  className={`mt-1 h-2 w-2 rounded-full ${item.read ? "bg-muted" : "bg-gold"}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{item.title}</p>
                  {item.message && (
                    <p className="mt-1 text-xs text-muted-foreground">{item.message}</p>
                  )}
                </div>
                {!item.read && (
                  <button
                    type="button"
                    className="mt-0.5 text-muted-foreground transition hover:text-foreground"
                    onClick={() => markNotificationRead(item.id)}
                    aria-label="Marcar como lida"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/10 outline-none transition hover:border-gold focus:ring-2 focus:ring-gold/60"
              aria-label="Abrir menu do perfil"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm font-semibold uppercase text-white/85">
                  {displayName.slice(0, 1)}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="truncate">{displayName}</p>
              <p className="truncate text-xs font-normal text-muted-foreground">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setProfileOpen(true)}>
              <Pencil className="h-4 w-4" />
              Editar perfil
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleSignOut}>
              <LogOut className="h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-60 lg:flex">
        <SideNav />
      </aside>

      <div className="flex min-h-screen min-w-0 flex-col lg:pl-60">
        <TopBar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Editar perfil</DialogTitle>
            <DialogDescription>
              Atualize seu nome e a foto exibida na Área do Cliente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Nome</Label>
              <Input
                id="profile-name"
                value={profileName}
                onChange={(event) => setProfileName(event.target.value)}
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-avatar">URL da foto</Label>
              <Input
                id="profile-avatar"
                value={profileAvatar}
                onChange={(event) => setProfileAvatar(event.target.value)}
                placeholder="https://..."
                type="url"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setProfileOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={saveProfile} disabled={savingProfile}>
              {savingProfile ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
