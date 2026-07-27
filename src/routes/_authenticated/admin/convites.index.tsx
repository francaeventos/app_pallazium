import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminEmptyState } from "@/components/AdminEmptyState";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { listInvitationOverviewFn } from "@/fns/admin-invitations";
import { invitationStatusLabels, type InvitationStatus } from "@/lib/invitation-utils";
import { CheckCircle2, MailCheck, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/convites/")({ component: Page });

type EventOverview = Awaited<ReturnType<typeof listInvitationOverviewFn>>[number];

function Page() {
  const [events, setEvents] = useState<EventOverview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listInvitationOverviewFn()
      .then(setEvents)
      .catch((error) =>
        toast.error(error instanceof Error ? error.message : "Não foi possível carregar os eventos."),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Experiência</p>
        <h1 className="font-serif text-4xl mt-2">Convites e RSVP</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Visão geral de todos os eventos: convite digital, convidados e confirmações.
        </p>
      </div>

      {!loading && events.length === 0 && (
        <AdminEmptyState
          icon={MailCheck}
          title="Crie um evento antes dos convites"
          description="Depois de cadastrar um evento, você poderá criar o convite digital, lista de convidados e padrinhos."
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {events.map((event) => (
          <Link
            key={event.id}
            to="/admin/convites/$eventId"
            params={{ eventId: event.id }}
            className="block"
          >
            <Card className="h-full transition-colors hover:border-gold">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{event.clients?.full_name ?? "Cliente"}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {event.event_type} • {formatDate(event.event_date)}
                    </p>
                  </div>
                  <Badge
                    variant={event.invitation_status === "publicado" ? "default" : "outline"}
                  >
                    {event.invitation_status
                      ? invitationStatusLabels[event.invitation_status as InvitationStatus]
                      : "Sem convite"}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <Metric icon={Users} label="Convidados" value={event.guests_total} />
                  <Metric icon={CheckCircle2} label="Confirmados" value={event.guests_confirmed} />
                  <Metric icon={MailCheck} label="Pendentes" value={event.guests_pending} />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border p-2">
      <Icon className="mx-auto h-3.5 w-3.5 text-gold" />
      <p className="mt-1 font-serif text-lg leading-none">{value}</p>
      <p className="mt-1 text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "sem data";
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}
