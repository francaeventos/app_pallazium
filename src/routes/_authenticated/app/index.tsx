import { createFileRoute, Link } from "@tanstack/react-router";
import { useMyEvent } from "@/hooks/use-my-event";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Clock, ChevronRight, Sparkles, ListChecks, UtensilsCrossed, Images, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/app/")({ component: Dashboard });

const quickLinks = [
  { to: "/app/checklist", label: "Checklist", icon: ListChecks },
  { to: "/app/pendencias", label: "Pendências", icon: AlertCircle },
  { to: "/app/cardapios", label: "Cardápios", icon: UtensilsCrossed },
  { to: "/app/upgrades", label: "Upgrades", icon: Sparkles },
  { to: "/app/referencias", label: "Referências", icon: Images },
];

function Dashboard() {
  const { data, loading } = useMyEvent();

  if (loading) return <div className="p-8 text-muted-foreground">Carregando seu evento…</div>;

  if (!data?.client || !data?.event) {
    return (
      <div className="p-6 lg:p-12">
        <Card className="max-w-2xl mx-auto bg-gradient-luxe border-0 shadow-luxe">
          <CardContent className="p-10 text-center">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-gold mb-4">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h2 className="font-serif text-3xl">Em breve, sua festa!</h2>
            <p className="mt-3 text-muted-foreground">
              Sua conta foi criada com sucesso. Nossa equipe está vinculando seu evento — você receberá um aviso assim que estiver tudo pronto.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { event, client, checklist } = data;
  const done = checklist.filter((c) => c.status === "concluido").length;
  const total = checklist.length || 1;
  const pct = Math.round((done / total) * 100);
  const upcoming = checklist
    .filter((c) => c.status !== "concluido")
    .sort((a, b) => {
      const p = { alta: 0, media: 1, baixa: 2 } as any;
      return p[a.priority] - p[b.priority];
    })
    .slice(0, 4);

  return (
    <div className="p-6 lg:p-10 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Olá, {client.full_name.split(" ")[0]}</p>
          <h1 className="font-serif text-4xl lg:text-5xl mt-2">Sua festa em detalhes</h1>
        </div>
        <Badge variant="outline" className="border-gold text-gold w-fit">
          {event.status.replace("_", " ")}
        </Badge>
      </div>

      <Card className="bg-gradient-luxe border-0 shadow-luxe overflow-hidden">
        <CardContent className="p-8 lg:p-10">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Info icon={<Sparkles className="h-4 w-4" />} label="Tipo" value={event.event_type} />
            <Info icon={<Calendar className="h-4 w-4" />} label="Data" value={event.event_date ? format(new Date(event.event_date + "T00:00:00"), "dd 'de' MMM, yyyy", { locale: ptBR }) : "—"} />
            <Info icon={<MapPin className="h-4 w-4" />} label="Local" value={event.location ?? "—"} />
            <Info icon={<Users className="h-4 w-4" />} label="Convidados" value={event.estimated_guests ?? "—"} />
          </div>
          {(event.start_time || event.end_time) && (
            <div className="mt-6 pt-6 border-t border-foreground/10 flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {event.start_time} {event.end_time && `— ${event.end_time}`}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-serif text-2xl">Progresso da organização</CardTitle>
            <span className="text-2xl font-serif text-gold">{pct}%</span>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={pct} className="h-2" />
          <p className="text-sm text-muted-foreground mt-3">
            {done} de {checklist.length} itens concluídos
          </p>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-2xl">Próximas pendências</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcoming.length === 0 && <p className="text-sm text-muted-foreground">Tudo em ordem! 🥂</p>}
            {upcoming.map((item) => (
              <Link
                key={item.id}
                to="/app/checklist"
                className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">Prioridade {item.priority}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-serif text-2xl">Acessos rápidos</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {quickLinks.map((q) => {
              const Icon = q.icon;
              return (
                <Link key={q.to} to={q.to} className="group rounded-xl border p-4 hover:border-gold hover:shadow-soft transition-all">
                  <Icon className="h-5 w-5 text-gold mb-2" />
                  <p className="text-sm font-medium">{q.label}</p>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: any }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </p>
      <p className="mt-1.5 font-serif text-xl text-foreground capitalize">{value}</p>
    </div>
  );
}
