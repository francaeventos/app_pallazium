import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { rsvpStatusLabels } from "@/lib/invitation-utils";
import { Calendar, CheckCircle2, MapPin, Search, Users, XCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/convite/$token")({ component: Page });

type Invitation = Database["public"]["Tables"]["event_invitations"]["Row"] & {
  events: {
    event_type: string;
    event_date: string | null;
    start_time: string | null;
    location: string | null;
  } | null;
};
type Guest = Database["public"]["Tables"]["event_guests"]["Row"];

function Page() {
  const { token } = Route.useParams();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [query, setQuery] = useState("");
  const [selectedGuestId, setSelectedGuestId] = useState("");
  const [companions, setCompanions] = useState(0);
  const [dietaryRestrictions, setDietaryRestrictions] = useState("");
  const [loading, setLoading] = useState(true);

  const filteredGuests = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return guests.slice(0, 8);
    return guests.filter((guest) => guest.name.toLowerCase().includes(normalized)).slice(0, 8);
  }, [guests, query]);
  const selectedGuest = guests.find((guest) => guest.id === selectedGuestId) ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    const { data: invitationData, error } = await supabase
      .from("event_invitations")
      .select("*, events(event_type, event_date, start_time, location)")
      .eq("public_token", token)
      .eq("status", "publicado")
      .maybeSingle();

    if (error || !invitationData) {
      setInvitation(null);
      setGuests([]);
      setLoading(false);
      return;
    }

    const { data: guestData } = await supabase
      .from("event_guests")
      .select("*")
      .eq("invitation_id", invitationData.id)
      .order("name");

    setInvitation(invitationData);
    setGuests(guestData ?? []);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const selectGuest = (guest: Guest) => {
    setSelectedGuestId(guest.id);
    setCompanions(guest.confirmed_companions);
    setDietaryRestrictions(guest.dietary_restrictions ?? "");
  };

  const respond = async (status: "confirmado" | "recusado") => {
    if (!selectedGuest) return toast.error("Selecione seu nome na lista.");
    const confirmedCompanions =
      status === "confirmado" ? Math.min(companions, selectedGuest.allowed_companions) : 0;
    const { error } = await supabase
      .from("event_guests")
      .update({
        rsvp_status: status,
        confirmed_companions: confirmedCompanions,
        dietary_restrictions: dietaryRestrictions || null,
        responded_at: new Date().toISOString(),
      })
      .eq("id", selectedGuest.id);
    if (error) return toast.error(error.message);
    toast.success(status === "confirmado" ? "Presença confirmada" : "Resposta registrada");
    load();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        Carregando convite…
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-lg text-center">
          <CardContent className="p-10">
            <h1 className="font-serif text-3xl">Convite indisponível</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Este convite não está publicado ou o link informado não é válido.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <main className="pallazium-invitation-shell min-h-screen">
      <section className="pallazium-invitation-hero relative overflow-hidden">
        {invitation.cover_image_url && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-45"
            style={{ backgroundImage: `url(${invitation.cover_image_url})` }}
          />
        )}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(144,117,84,0.22),transparent_34rem)]" />
        <div className="relative mx-auto max-w-5xl px-6 py-20 text-center text-white lg:py-28">
          <div className="mx-auto mb-8 w-fit border-y border-gold/70 px-8 py-3">
            <p className="font-serif text-xs uppercase tracking-[0.55em] text-gold">Espaço</p>
            <p className="mt-1 font-serif text-3xl font-bold tracking-wide text-white">PALLAZIUM</p>
          </div>
          <p className="text-xs uppercase tracking-[0.35em] text-gold">Convite especial</p>
          <h1 className="mx-auto mt-4 max-w-4xl font-serif text-5xl leading-none lg:text-7xl">
            {invitation.title}
          </h1>
          {invitation.message && (
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-white/80">
              {invitation.message}
            </p>
          )}
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <Info
              icon={<Calendar className="h-4 w-4" />}
              label="Data"
              value={invitation.events?.event_date}
            />
            <Info
              icon={<MapPin className="h-4 w-4" />}
              label="Local"
              value={invitation.reception_location ?? invitation.events?.location}
            />
            <Info
              icon={<Users className="h-4 w-4" />}
              label="Traje"
              value={invitation.dress_code}
            />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 py-10 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="pallazium-invitation-card">
          <CardContent className="p-6 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                Confirmação
              </p>
              <h2 className="mt-2 font-serif text-3xl">Encontre seu nome</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Busque pelo nome cadastrado no convite e confirme sua presença.
              </p>
            </div>
            <div>
              <Label>Buscar convidado</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              {filteredGuests.map((guest) => (
                <button
                  key={guest.id}
                  type="button"
                  onClick={() => selectGuest(guest)}
                  className={`w-full rounded-xl border p-3 text-left transition-colors ${
                    selectedGuestId === guest.id ? "border-gold bg-champagne" : "hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{guest.name}</span>
                    <Badge variant={guest.rsvp_status === "confirmado" ? "default" : "outline"}>
                      {rsvpStatusLabels[guest.rsvp_status]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {guest.group_name ?? "Convidado"} • até {guest.allowed_companions}{" "}
                    acompanhante(s)
                  </p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="pallazium-invitation-card">
          <CardContent className="p-6 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">RSVP</p>
              <h2 className="mt-2 font-serif text-3xl">
                {selectedGuest ? selectedGuest.name : "Selecione um convidado"}
              </h2>
            </div>
            {selectedGuest ? (
              <>
                <div>
                  <Label>Acompanhantes confirmados</Label>
                  <Input
                    type="number"
                    min="0"
                    max={selectedGuest.allowed_companions}
                    value={companions}
                    onChange={(event) => setCompanions(Number(event.target.value) || 0)}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Permitido: {selectedGuest.allowed_companions} acompanhante(s).
                  </p>
                </div>
                <div>
                  <Label>Restrições alimentares</Label>
                  <Textarea
                    value={dietaryRestrictions}
                    onChange={(event) => setDietaryRestrictions(event.target.value)}
                    placeholder="Vegetariano, alergias, intolerâncias..."
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => respond("confirmado")}>
                    <CheckCircle2 className="mr-1 h-4 w-4" />
                    Confirmar presença
                  </Button>
                  <Button variant="outline" onClick={() => respond("recusado")}>
                    <XCircle className="mr-1 h-4 w-4" />
                    Não poderei ir
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Depois de selecionar seu nome, você poderá confirmar presença e informar
                acompanhantes.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-12">
        <Card className="pallazium-invitation-card">
          <CardContent className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
            <InfoBox label="Cerimônia" value={invitation.ceremony_location} />
            <InfoBox label="Recepção" value={invitation.reception_location} />
            <InfoBox label="Dress code" value={invitation.dress_code} />
            <InfoBox
              label="Mapa"
              value={invitation.map_url ? "Abrir localização" : "A definir"}
              href={invitation.map_url}
            />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function Info({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
}) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/10 p-4 text-left">
      <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-gold">
        {icon} {label}
      </p>
      <p className="mt-2 text-sm text-white/90">{value || "A definir"}</p>
    </div>
  );
}

function InfoBox({
  label,
  value,
  href,
}: {
  label: string;
  value?: string | null;
  href?: string | null;
}) {
  return (
    <div className="rounded-xl border p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      {href ? (
        <a
          className="mt-2 block text-sm text-gold underline"
          href={href}
          target="_blank"
          rel="noreferrer"
        >
          {value}
        </a>
      ) : (
        <p className="mt-2 text-sm">{value || "A definir"}</p>
      )}
    </div>
  );
}
