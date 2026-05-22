import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, AlertCircle, Sparkles, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({ component: Dashboard });

function Dashboard() {
  const [stats, setStats] = useState({ active: 0, upcoming: 0, critical: 0, completed: 0, interests: 0 });
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [{ count: active }, { count: completed }, { data: evs }, { data: ints }] = await Promise.all([
        supabase.from("events").select("*", { count: "exact", head: true }).neq("status", "concluido").neq("status", "cancelado"),
        supabase.from("events").select("*", { count: "exact", head: true }).eq("status", "concluido"),
        supabase.from("events").select("*, clients(full_name)").order("event_date", { ascending: true }).limit(20),
        supabase.from("upgrade_interests").select("*").eq("status", "novo"),
      ]);

      const today = new Date();
      const upcoming = (evs ?? []).filter((e) => e.event_date && new Date(e.event_date) >= today).length;

      setStats({
        active: active ?? 0,
        upcoming,
        critical: 0,
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
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={Calendar} label="Eventos ativos" value={stats.active} />
        <Stat icon={Calendar} label="Próximos" value={stats.upcoming} />
        <Stat icon={Sparkles} label="Novos interesses" value={stats.interests} />
        <Stat icon={CheckCircle2} label="Concluídos" value={stats.completed} />
      </div>

      <Card>
        <CardHeader><CardTitle className="font-serif text-2xl">Eventos</CardTitle></CardHeader>
        <CardContent>
          {events.length === 0 && <p className="text-sm text-muted-foreground">Nenhum evento cadastrado.</p>}
          <div className="divide-y">
            {events.map((e) => (
              <div key={e.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{e.clients?.full_name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground capitalize">{e.event_type} • {e.event_date ?? "sem data"}</p>
                </div>
                <span className="text-xs uppercase tracking-wider text-muted-foreground">{e.status.replace("_", " ")}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: any) {
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
