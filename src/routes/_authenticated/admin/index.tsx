import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { getAdminDashboardFn } from "@/fns/admin-dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  ListChecks,
  MailCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
export const Route = createFileRoute("/_authenticated/admin/")({ component: Dashboard });

type EventRow = {
  id: string;
  event_type: string;
  event_date: string | null;
  estimated_guests: number | null;
  status: string;
  clients: { full_name: string; email: string; whatsapp: string | null } | null;
};
type ChecklistItem = {
  id: string;
  event_id: string;
  title: string;
  priority: string;
  status: string;
  due_date: string | null;
};
type Guest = {
  event_id: string;
  rsvp_status: string;
  confirmed_companions: number;
};
type UpgradeInterest = {
  id: string;
  event_id: string;
  status: string;
  created_at: string;
};
type MenuInterest = {
  id: string;
  event_id: string;
  status: string;
  created_at: string;
};

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [upgradeInterests, setUpgradeInterests] = useState<UpgradeInterest[]>([]);
  const [menuInterests, setMenuInterests] = useState<MenuInterest[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await getAdminDashboardFn();
        setEvents(data.events as EventRow[]);
        setChecklistItems(data.checklist_items);
        setGuests(data.guests);
        setUpgradeInterests(data.upgrade_interests);
        setMenuInterests(data.menu_interests);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const today = useMemo(() => startOfToday(), []);
  const next30Days = useMemo(() => addDays(today, 30), [today]);
  const activeEvents = events.filter(
    (event) => event.status !== "concluido" && event.status !== "cancelado",
  );
  const upcomingEvents = activeEvents
    .filter((event) => {
      if (!event.event_date) return false;
      const eventDate = parseDate(event.event_date);
      return eventDate >= today && eventDate <= next30Days;
    })
    .slice(0, 6);
  const overdueChecklist = checklistItems.filter(
    (item) => item.due_date && parseDate(item.due_date) < today,
  );
  const highPriorityChecklist = checklistItems.filter(
    (item) => item.priority === "alta" && item.status !== "concluido",
  );
  const openInterests = [...upgradeInterests, ...menuInterests].filter(
    (interest) => interest.status === "novo" || interest.status === "em_contato",
  );

  const guestTotals = guests.reduce(
    (acc, guest) => {
      acc.total += 1;
      if (guest.rsvp_status === "confirmado") {
        acc.confirmed += 1;
        acc.people += 1 + guest.confirmed_companions;
      }
      if (guest.rsvp_status === "pendente") acc.pending += 1;
      if (guest.rsvp_status === "recusado") acc.declined += 1;
      return acc;
    },
    { total: 0, confirmed: 0, people: 0, pending: 0, declined: 0 },
  );

  const attentionItems = [
    ...overdueChecklist.slice(0, 4).map((item) => ({
      id: item.id,
      title: item.title,
      meta: `Checklist vencido • ${eventLabel(events, item.event_id)}`,
      tone: "danger" as const,
      to: "/admin/checklist/$eventId" as const,
      params: { eventId: item.event_id },
    })),
    ...highPriorityChecklist
      .filter((item) => !overdueChecklist.some((overdue) => overdue.id === item.id))
      .slice(0, 4)
      .map((item) => ({
        id: item.id,
        title: item.title,
        meta: `Alta prioridade • ${eventLabel(events, item.event_id)}`,
        tone: "warning" as const,
        to: "/admin/checklist/$eventId" as const,
        params: { eventId: item.event_id },
      })),
  ].slice(0, 6);

  if (loading) return <div className="p-8 text-muted-foreground">Carregando operação…</div>;

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Operação Pallazium
          </p>
          <h1 className="font-serif text-4xl mt-2">Painel executivo</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Priorize próximos eventos, pendências críticas, confirmações e oportunidades comerciais.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/admin/eventos">
              <Calendar className="mr-2 h-4 w-4" />
              Ver calendário
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/admin/interesses">
              <Sparkles className="mr-2 h-4 w-4" />
              Interesses
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric icon={Calendar} label="Eventos ativos" value={activeEvents.length} />
        <Metric icon={Clock} label="Próximos 30 dias" value={upcomingEvents.length} />
        <Metric
          icon={AlertCircle}
          label="Checklist em alerta"
          value={highPriorityChecklist.length}
        />
        <Metric icon={MailCheck} label="RSVP pendentes" value={guestTotals.pending} />
        <Metric icon={Sparkles} label="Interesses abertos" value={openInterests.length} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-2xl">Próximos eventos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingEvents.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum evento nos próximos 30 dias.</p>
            )}
            {upcomingEvents.map((event) => (
              <EventRowCard
                key={event.id}
                event={event}
                guests={guests}
                checklist={checklistItems}
              />
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-2xl">Atenção hoje</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {attentionItems.length === 0 && (
                <div className="rounded-2xl border border-gold/20 bg-champagne/40 p-4">
                  <p className="flex items-center gap-2 font-medium">
                    <CheckCircle2 className="h-4 w-4 text-gold" />
                    Nenhuma pendência crítica
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Os checklists não têm itens vencidos ou de alta prioridade em aberto.
                  </p>
                </div>
              )}
              {attentionItems.map((item) => (
                <Link
                  key={item.id}
                  to={item.to}
                  params={item.params}
                  className="block rounded-2xl border p-4 transition-colors hover:bg-muted/40"
                >
                  <Badge variant="outline" className={item.tone === "danger" ? "text-rose" : ""}>
                    {item.tone === "danger" ? "Vencido" : "Alta prioridade"}
                  </Badge>
                  <p className="mt-2 font-medium">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.meta}</p>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-2xl">RSVP geral</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <MiniStat label="Convidados" value={guestTotals.total} />
              <MiniStat label="Confirmados" value={guestTotals.confirmed} />
              <MiniStat label="Pessoas" value={guestTotals.people} />
              <MiniStat label="Recusados" value={guestTotals.declined} />
              <Button asChild variant="outline" className="col-span-2">
                <Link to="/admin/convites">Abrir convites e RSVP</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-2xl">Atalhos de gestão</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction to="/admin/clientes" icon={Users} title="Clientes e acessos" />
          <QuickAction to="/admin/checklist" icon={ListChecks} title="Checklists por evento" />
          <QuickAction to="/admin/referencias" icon={Sparkles} title="Biblioteca de referências" />
          <QuickAction to="/admin/notificacoes" icon={MailCheck} title="Enviar notificações" />
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-champagne text-gold">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="font-serif text-3xl leading-none">{value}</p>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function EventRowCard({
  event,
  guests,
  checklist,
}: {
  event: EventRow;
  guests: Guest[];
  checklist: ChecklistItem[];
}) {
  const eventGuests = guests.filter((guest) => guest.event_id === event.id);
  const confirmed = eventGuests.filter((guest) => guest.rsvp_status === "confirmado").length;
  const pending = eventGuests.filter((guest) => guest.rsvp_status === "pendente").length;
  const openChecklist = checklist.filter((item) => item.event_id === event.id).length;

  return (
    <div className="grid gap-3 rounded-2xl border p-4 lg:grid-cols-[1fr_auto] lg:items-center">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-serif text-2xl">{event.clients?.full_name ?? "Cliente"}</p>
          <Badge variant="outline" className="capitalize">
            {event.status.replace("_", " ")}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {event.event_type} • {formatDate(event.event_date)} • {event.estimated_guests ?? "?"}{" "}
          convidados
        </p>
        <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
          <span>RSVP confirmados: {confirmed}</span>
          <span>Pendentes: {pending}</span>
          <span>Checklist aberto: {openChecklist}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 lg:justify-end">
        <Button asChild size="sm" variant="outline">
          <Link to="/admin/checklist/$eventId" params={{ eventId: event.id }}>
            Checklist
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to="/admin/convites">RSVP</Link>
        </Button>
        <Button asChild size="sm">
          <Link to="/admin/eventos">Evento</Link>
        </Button>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-muted/30 p-4">
      <p className="font-serif text-3xl">{value}</p>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function QuickAction({ to, icon: Icon, title }: { to: string; icon: LucideIcon; title: string }) {
  return (
    <Button asChild variant="outline" className="h-auto justify-start gap-3 p-4">
      <Link to={to}>
        <Icon className="h-4 w-4 text-gold" />
        {title}
      </Link>
    </Button>
  );
}

function eventLabel(events: EventRow[], eventId: string) {
  const event = events.find((item) => item.id === eventId);
  return event ? `${event.clients?.full_name ?? "Cliente"} • ${event.event_type}` : "Evento";
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(value: string | null) {
  if (!value) return "sem data";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parseDate(value));
}
