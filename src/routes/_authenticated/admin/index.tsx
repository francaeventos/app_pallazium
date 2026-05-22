import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  Bell,
  Calendar,
  CheckCircle2,
  GalleryHorizontalEnd,
  Images,
  Lightbulb,
  ListChecks,
  Sparkles,
  UtensilsCrossed,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/admin/")({ component: Dashboard });

type EventRow = Database["public"]["Tables"]["events"]["Row"];
type EventListItem = EventRow & {
  clients: { full_name: string } | null;
};

function Dashboard() {
  const [stats, setStats] = useState({
    active: 0,
    upcoming: 0,
    critical: 0,
    completed: 0,
    interests: 0,
  });
  const [events, setEvents] = useState<EventListItem[]>([]);

  useEffect(() => {
    (async () => {
      const [
        { count: active },
        { count: completed },
        { data: evs },
        { data: ints },
        { count: critical },
      ] = await Promise.all([
        supabase
          .from("events")
          .select("*", { count: "exact", head: true })
          .neq("status", "concluido")
          .neq("status", "cancelado"),
        supabase
          .from("events")
          .select("*", { count: "exact", head: true })
          .eq("status", "concluido"),
        supabase
          .from("events")
          .select("*, clients(full_name)")
          .order("event_date", { ascending: true })
          .limit(20),
        supabase.from("upgrade_interests").select("*").eq("status", "novo"),
        supabase
          .from("checklist_items")
          .select("*", { count: "exact", head: true })
          .eq("priority", "alta")
          .neq("status", "concluido"),
      ]);

      const today = new Date();
      const upcoming = (evs ?? []).filter(
        (e) => e.event_date && new Date(e.event_date) >= today,
      ).length;

      setStats({
        active: active ?? 0,
        upcoming,
        critical: critical ?? 0,
        completed: completed ?? 0,
        interests: ints?.length ?? 0,
      });
      setEvents(evs ?? []);
    })();
  }, []);

  return (
    <div className="p-6 lg:p-10 space-y-8 max-w-7xl mx-auto">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Equipe</p>
        <h1 className="font-serif text-4xl mt-2">Visão geral</h1>
        <p className="mt-2 text-muted-foreground">
          Central administrativa para gerenciar clientes, eventos e conteúdos da Área do Cliente.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminAction
          to="/admin/clientes"
          icon={Users}
          title="Clientes"
          text="Cadastrar, editar e vincular acesso."
        />
        <AdminAction
          to="/admin/eventos"
          icon={Calendar}
          title="Eventos"
          text="Criar eventos e dados do contrato."
        />
        <AdminAction
          to="/admin/checklist"
          icon={ListChecks}
          title="Checklists"
          text="Controlar pendências por evento."
        />
        <AdminAction
          to="/admin/cardapios"
          icon={UtensilsCrossed}
          title="Cardápios"
          text="Adicionar, editar e publicar menus."
        />
        <AdminAction
          to="/admin/upgrades"
          icon={Sparkles}
          title="Upgrades"
          text="Gerenciar ofertas comerciais."
        />
        <AdminAction
          to="/admin/referencias"
          icon={Images}
          title="Referências"
          text="Acompanhar inspirações dos clientes."
        />
        <AdminAction
          to="/admin/parceiros"
          icon={Users}
          title="Parceiros"
          text="Cadastrar fornecedores recomendados."
        />
        <AdminAction
          to="/admin/dicas"
          icon={Lightbulb}
          title="Dicas"
          text="Publicar orientações para clientes."
        />
        <AdminAction
          to="/admin/portfolio"
          icon={GalleryHorizontalEnd}
          title="Portfólio"
          text="Publicar eventos realizados."
        />
        <AdminAction
          to="/admin/interesses"
          icon={Sparkles}
          title="Interesses"
          text="Acompanhar cardápios e upgrades."
        />
        <AdminAction
          to="/admin/notificacoes"
          icon={Bell}
          title="Notificações"
          text="Enviar avisos para clientes."
        />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Stat icon={Calendar} label="Eventos ativos" value={stats.active} />
        <Stat icon={Calendar} label="Próximos" value={stats.upcoming} />
        <Stat icon={AlertCircle} label="Pendências críticas" value={stats.critical} />
        <Stat icon={Sparkles} label="Novos interesses" value={stats.interests} />
        <Stat icon={CheckCircle2} label="Concluídos" value={stats.completed} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-2xl">Eventos</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum evento cadastrado.</p>
          )}
          <div className="divide-y">
            {events.map((e) => (
              <div key={e.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{e.clients?.full_name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {e.event_type} • {e.event_date ?? "sem data"}
                  </p>
                </div>
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  {e.status.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <Icon className="h-5 w-5 text-gold" />
        </div>
        <p className="font-serif text-4xl mt-3">{value}</p>
        <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}

function AdminAction({
  to,
  icon: Icon,
  title,
  text,
}: {
  to: string;
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <Card className="border-gold/20">
      <CardContent className="flex h-full flex-col gap-4 p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-champagne text-gold">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="font-serif text-xl">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{text}</p>
        </div>
        <Button asChild variant="outline" size="sm" className="mt-auto w-fit">
          <Link to={to}>Gerenciar</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
