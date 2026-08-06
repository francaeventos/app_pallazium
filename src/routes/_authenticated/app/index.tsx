import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMyEvent } from "@/hooks/use-my-event";
import { getClientMenuVisibilityFn } from "@/fns/app-settings";
import { CLIENT_MENU_ITEMS, isClientMenuItemVisible } from "@/lib/client-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ClientEmptyState } from "@/components/ClientEmptyState";
import { MenuDetailsDialog } from "@/components/MenuDetailsDialog";
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  ChevronRight,
  Sparkles,
  ListChecks,
  UtensilsCrossed,
  Images,
  AlertCircle,
  AlertTriangle,
  Check,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { GUEST_LIMIT_ERROR_MESSAGE } from "@/lib/guest-limit";

export const Route = createFileRoute("/_authenticated/app/")({ component: Dashboard });

const quickLinks = [
  { key: "checklist", to: "/app/checklist", label: "Checklist", icon: ListChecks },
  { key: "pendencias", to: "/app/pendencias", label: "Pendências", icon: AlertCircle },
  { key: "cardapios", to: "/app/cardapios", label: "Cardápios", icon: UtensilsCrossed },
  { key: "upgrades", to: "/app/upgrades", label: "Upgrades", icon: Sparkles },
  { key: "referencias", to: "/app/referencias", label: "Referências", icon: Images },
] satisfies Array<{ key: (typeof CLIENT_MENU_ITEMS)[number]["key"]; to: string; label: string; icon: typeof ListChecks }>;

function Dashboard() {
  const { data, loading } = useMyEvent();
  const [menuDialogOpen, setMenuDialogOpen] = useState(false);
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});

  useEffect(() => {
    getClientMenuVisibilityFn()
      .then(({ visibility }) => setVisibility(visibility))
      .catch(() => {});
  }, []);

  if (loading) return <div className="p-8 text-muted-foreground">Carregando seu evento…</div>;

  if (!data?.client || !data?.event) {
    return (
      <div className="p-6 lg:p-12">
        <ClientEmptyState
          icon={Sparkles}
          title="Sua área está em configuração"
          description="Sua conta foi criada com sucesso. A equipe Pallazium está vinculando os dados do evento para liberar checklist, cardápios, referências e acompanhamento em um só lugar."
        />
      </div>
    );
  }

  const { event, client, checklist, guestLimitExceeded } = data;
  const [guestLimitTitle, guestLimitBody] = GUEST_LIMIT_ERROR_MESSAGE.split("\n\n");
  const done = checklist.filter((c) => c.status === "concluido").length;
  const total = checklist.length || 1;
  const pct = Math.round((done / total) * 100);
  const upcoming = checklist
    .filter((c) => c.status !== "concluido")
    .sort((a, b) => {
      const p: Record<string, number> = { alta: 0, media: 1, baixa: 2 };
      return p[a.priority] - p[b.priority];
    })
    .slice(0, 4);
  const visibleQuickLinks = quickLinks.filter((q) => isClientMenuItemVisible(visibility, q.key));
  const showProgress = isClientMenuItemVisible(visibility, "dashboardProgress");
  const showPendingPreview = isClientMenuItemVisible(visibility, "dashboardPendingPreview");

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-7">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Olá, {client.full_name.split(" ")[0]}
          </p>
          <h1 className="font-serif text-4xl lg:text-5xl mt-2">Sua festa em detalhes</h1>
        </div>
        <Badge variant="outline" className="border-gold text-gold w-fit">
          {event.status.replace("_", " ")}
        </Badge>
      </div>

      {guestLimitExceeded && (
        <Alert variant="destructive" className="border-destructive/70 bg-destructive/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{guestLimitTitle}</AlertTitle>
          <AlertDescription>{guestLimitBody}</AlertDescription>
        </Alert>
      )}

      <Card className="pallazium-feature-card shadow-luxe overflow-hidden">
        <CardContent className="p-6 lg:p-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Info icon={<Sparkles className="h-4 w-4" />} label="Tipo" value={event.event_type} />
            <Info
              icon={<Calendar className="h-4 w-4" />}
              label="Data"
              value={
                event.event_date
                  ? format(new Date(event.event_date + "T00:00:00"), "dd 'de' MMM, yyyy", {
                      locale: ptBR,
                    })
                  : "—"
              }
            />
            <Info
              icon={<MapPin className="h-4 w-4" />}
              label="Local"
              value={event.location ?? "—"}
            />
            <Info
              icon={<Users className="h-4 w-4" />}
              label="Convidados"
              value={event.estimated_guests ?? "—"}
            />
          </div>
          {(event.start_time || event.end_time) && (
            <div className="pallazium-feature-muted mt-6 flex items-center gap-2 border-t border-white/10 pt-6 text-sm">
              <Clock className="h-4 w-4" />
              {event.start_time} {event.end_time && `— ${event.end_time}`}
            </div>
          )}
          <Countdown eventDate={event.event_date} startTime={event.start_time} />
        </CardContent>
      </Card>

      {showProgress && (
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
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-2xl">Cardápio</CardTitle>
          </CardHeader>
          <CardContent>
            {event.menu ? (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-serif text-xl">{event.menu.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{event.menu.category}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setMenuDialogOpen(true)}>
                  Ver cardápio completo
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Cardápio ainda não definido.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-2xl">Upgrades contratados</CardTitle>
          </CardHeader>
          <CardContent>
            {event.upgrades.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum upgrade adicional contratado.
              </p>
            ) : (
              <ul className="space-y-2">
                {event.upgrades.map((upgrade) => (
                  <li key={upgrade.id} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-gold" />
                    {upgrade.name}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <MenuDetailsDialog
        menu={menuDialogOpen ? event.menu : null}
        onClose={() => setMenuDialogOpen(false)}
      />

      {(showPendingPreview || visibleQuickLinks.length > 0) && (
        <div className="grid lg:grid-cols-2 gap-6">
          {showPendingPreview && (
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-2xl">Próximas pendências</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcoming.length === 0 && (
                  <p className="text-sm text-muted-foreground">Tudo em ordem! 🥂</p>
                )}
                {upcoming.map((item) => (
                  <Link
                    key={item.id}
                    to="/app/checklist"
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        Prioridade {item.priority}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {visibleQuickLinks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-2xl">Acessos rápidos</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                {visibleQuickLinks.map((q) => {
                  const Icon = q.icon;
                  return (
                    <Link
                      key={q.to}
                      to={q.to}
                      className="group rounded-xl border p-4 hover:border-gold hover:shadow-soft transition-all"
                    >
                      <Icon className="h-5 w-5 text-gold mb-2" />
                      <p className="text-sm font-medium">{q.label}</p>
                    </Link>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function Info({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div>
      <p className="pallazium-feature-muted flex items-center gap-1.5 text-xs uppercase tracking-wider">
        {icon} {label}
      </p>
      <p className="pallazium-feature-value mt-1.5 font-serif text-xl capitalize">{value}</p>
    </div>
  );
}

function Countdown({
  eventDate,
  startTime,
}: {
  eventDate?: string | null;
  startTime?: string | null;
}) {
  const target = useMemo(() => buildEventDateTime(eventDate, startTime), [eventDate, startTime]);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  if (!target) return null;

  const countdown = getCountdown(target, now);
  const dateLabel = format(target, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const timeLabel = format(target, "HH:mm", { locale: ptBR });

  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="pallazium-feature-muted flex items-center gap-2 text-xs uppercase tracking-[0.2em]">
            <Clock className="h-4 w-4" />
            Contagem regressiva
          </p>
          <p className="mt-2 font-serif text-2xl text-white">
            {dateLabel} às {timeLabel}
          </p>
        </div>
        {countdown.finished ? (
          <p className="rounded-xl bg-white/15 px-4 py-3 font-serif text-2xl text-white">
            O grande dia chegou
          </p>
        ) : (
          <div className="grid grid-cols-4 gap-2 text-center">
            <CountdownUnit label="Dias" value={countdown.days} />
            <CountdownUnit label="Horas" value={countdown.hours} />
            <CountdownUnit label="Min" value={countdown.minutes} />
            <CountdownUnit label="Seg" value={countdown.seconds} />
          </div>
        )}
      </div>
    </div>
  );
}

function CountdownUnit({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-16 rounded-xl bg-white/15 px-3 py-2">
      <p className="font-serif text-2xl text-white">{String(value).padStart(2, "0")}</p>
      <p className="text-[0.65rem] uppercase tracking-wider text-white/65">{label}</p>
    </div>
  );
}

function buildEventDateTime(eventDate?: string | null, startTime?: string | null) {
  if (!eventDate) return null;
  const cleanTime = startTime?.trim() || "00:00:00";
  const date = new Date(`${eventDate}T${cleanTime}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getCountdown(target: Date, now: Date) {
  const diff = Math.max(target.getTime() - now.getTime(), 0);
  const totalSeconds = Math.floor(diff / 1000);

  return {
    finished: diff <= 0,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}
