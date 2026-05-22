import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, LogOut, type LucideIcon } from "lucide-react";
import { type ReactNode, useState } from "react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

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

  const isActive = (to: string) =>
    to === "/app" || to === "/admin" ? location.pathname === to : location.pathname.startsWith(to);

  const SideNav = () => (
    <div className="pallazium-sidebar flex h-full flex-col">
      <div className="pallazium-sidebar-brand border-b p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-gold shadow-luxe">
            <span className="font-serif text-xl text-white">P</span>
          </div>
          <div>
            <p className="font-serif text-xl leading-none text-white">Pallazium</p>
            <p className="pallazium-sidebar-muted mt-1 text-[10px] uppercase tracking-[0.28em]">
              {title}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
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
        <p className="pallazium-sidebar-muted mb-2 truncate text-xs">{user?.email}</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            await signOut();
            navigate({ to: "/login" });
          }}
          className="w-full justify-start text-white/75 hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4 mr-2" /> Sair
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden w-72 border-r lg:flex">
        <SideNav />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center justify-between border-b px-4 py-3 bg-card">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-gold flex items-center justify-center">
              <span className="font-serif text-white">P</span>
            </div>
            <span className="font-serif text-lg">Pallazium</span>
          </div>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SideNav />
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
