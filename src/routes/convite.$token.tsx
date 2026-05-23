import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { rsvpStatusLabels, type RsvpStatus } from "@/lib/invitation-utils";
import { Calendar, CheckCircle2, Gift, MapPin, Navigation, Users, XCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/convite/$token")({ component: Page });

type InvitationGuest =
  Database["public"]["Functions"]["get_invitation_guest_by_token"]["Returns"][number];

function Page() {
  const { token } = Route.useParams();
  const [details, setDetails] = useState<InvitationGuest | null>(null);
  const [companions, setCompanions] = useState(0);
  const [dietaryRestrictions, setDietaryRestrictions] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_invitation_guest_by_token", {
      _guest_token: token,
    });

    const row = data?.[0] ?? null;
    if (error || !row) {
      setDetails(null);
      setLoading(false);
      return;
    }

    setDetails(row);
    setCompanions(row.confirmed_companions);
    setDietaryRestrictions(row.dietary_restrictions ?? "");
    setLoading(false);
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const respond = async (status: "confirmado" | "recusado") => {
    if (!details) return toast.error("Convite indisponível.");
    const { data, error } = await supabase.rpc("respond_invitation_guest", {
      _guest_token: token,
      _rsvp_status: status as RsvpStatus,
      _confirmed_companions: status === "confirmado" ? companions : 0,
      _dietary_restrictions: dietaryRestrictions || null,
    });
    if (error) return toast.error(error.message);
    if (data?.[0]) {
      setDetails(data[0]);
      setCompanions(data[0].confirmed_companions);
      setDietaryRestrictions(data[0].dietary_restrictions ?? "");
    }
    toast.success(status === "confirmado" ? "Presença confirmada" : "Resposta registrada");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        Carregando convite…
      </div>
    );
  }

  if (!details) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-lg text-center">
          <CardContent className="p-10">
            <h1 className="font-serif text-3xl">Convite indisponível</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Este link individual não está publicado ou não é válido.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const addressForMap =
    details.reception_location || details.ceremony_location || details.event_location || "";
  const mapEmbedUrl = addressForMap
    ? `https://maps.google.com/maps?q=${encodeURIComponent(addressForMap)}&output=embed`
    : null;
  const routeUrl =
    details.map_url ||
    (addressForMap
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressForMap)}`
      : null);

  return (
    <main className="pallazium-invitation-shell min-h-screen">
      <section className="pallazium-invitation-hero relative overflow-hidden">
        {details.cover_image_url && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-45"
            style={{ backgroundImage: `url(${details.cover_image_url})` }}
          />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(43,36,28,0.82),rgba(43,36,28,0.72)),radial-gradient(circle_at_center,rgba(144,117,84,0.2),transparent_34rem)]" />
        <div className="relative mx-auto max-w-5xl px-6 py-20 text-center text-white lg:py-28">
          <div className="mx-auto mb-8 w-fit rounded-xl border border-gold/50 bg-white/95 px-5 py-3 shadow-luxe">
            <img
              src="/logo-pallazium.png"
              alt="Espaço Pallazium"
              className="h-auto w-64 max-w-[70vw]"
            />
          </div>
          <p className="text-xs uppercase tracking-[0.35em] text-gold">Convite especial</p>
          <h1 className="mx-auto mt-4 max-w-4xl font-serif text-5xl leading-none lg:text-7xl">
            {details.invitation_title}
          </h1>
          {details.invitation_message && (
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-white/80">
              {details.invitation_message}
            </p>
          )}
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <Info icon={<Calendar className="h-4 w-4" />} label="Data" value={details.event_date} />
            <Info
              icon={<MapPin className="h-4 w-4" />}
              label="Local"
              value={details.reception_location ?? details.event_location}
            />
            <Info icon={<Users className="h-4 w-4" />} label="Traje" value={details.dress_code} />
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
              <h2 className="mt-2 font-serif text-3xl">Convite individual</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Este link é exclusivo para o convidado abaixo. Ele não exibe a lista completa do
                evento.
              </p>
            </div>
            <div className="rounded-2xl border border-gold/30 bg-champagne/60 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                    Convidado
                  </p>
                  <p className="mt-2 font-serif text-3xl">{details.guest_name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {details.guest_group_name ?? "Convidado"} •{" "}
                    {details.allowed_companions > 0
                      ? `até ${details.allowed_companions} acompanhante(s)`
                      : "sem acompanhantes"}
                  </p>
                </div>
                <Badge variant={details.rsvp_status === "confirmado" ? "default" : "outline"}>
                  {rsvpStatusLabels[details.rsvp_status]}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="pallazium-invitation-card">
          <CardContent className="p-6 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">RSVP</p>
              <h2 className="mt-2 font-serif text-3xl">{details.guest_name}</h2>
            </div>
            <>
              {details.allowed_companions > 0 && (
                <div>
                  <Label>Acompanhantes confirmados</Label>
                  <Input
                    type="number"
                    min="0"
                    max={details.allowed_companions}
                    value={companions}
                    onChange={(event) => setCompanions(Number(event.target.value) || 0)}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Permitido: {details.allowed_companions} acompanhante(s).
                  </p>
                </div>
              )}
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
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-12 lg:grid-cols-[1.3fr_0.7fr]">
        <Card className="pallazium-invitation-card overflow-hidden">
          <CardContent className="grid gap-0 p-0 md:grid-cols-[1fr_0.9fr]">
            <div className="space-y-4 p-6">
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                Como chegar
              </p>
              <h2 className="font-serif text-3xl">Localização do evento</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoBox label="Cerimônia" value={details.ceremony_location} />
                <InfoBox label="Recepção" value={details.reception_location} />
              </div>
              {routeUrl ? (
                <Button asChild className="mt-2">
                  <a href={routeUrl} target="_blank" rel="noreferrer">
                    <Navigation className="mr-2 h-4 w-4" />
                    Abrir rota no mapa
                  </a>
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  A rota será disponibilizada pela organização em breve.
                </p>
              )}
            </div>
            {mapEmbedUrl ? (
              <iframe
                title="Mapa do evento"
                src={mapEmbedUrl}
                className="min-h-72 w-full border-0 md:min-h-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <div className="flex min-h-64 items-center justify-center bg-[radial-gradient(circle_at_25%_25%,rgba(144,117,84,0.25),transparent_18rem),linear-gradient(135deg,#efe6da,#fffaf7)] p-8 text-center">
                <div className="rounded-3xl border border-gold/30 bg-white/80 p-6 shadow-soft">
                  <MapPin className="mx-auto h-10 w-10 text-gold" />
                  <p className="mt-3 font-serif text-2xl text-[#4a3c2e]">Mapa e rota</p>
                  <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                    A localização aparecerá aqui quando o endereço for informado.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="pallazium-invitation-card">
          <CardContent className="space-y-4 p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-champagne text-gold">
              <Gift className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                Lista de presentes
              </p>
              <h2 className="mt-2 font-serif text-3xl">Presentes</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Sua presença é o mais importante. Caso queira presentear, acesse a lista oficial.
              </p>
            </div>
            {details.gift_list_url ? (
              <Button asChild variant="outline">
                <a href={details.gift_list_url} target="_blank" rel="noreferrer">
                  <Gift className="mr-2 h-4 w-4" />
                  Abrir lista de presentes
                </a>
              </Button>
            ) : (
              <p className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
                Lista de presentes ainda não informada.
              </p>
            )}
            <InfoBox label="Dress code" value={details.dress_code} />
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
    <div className="rounded-xl border border-gold/45 bg-[#fffaf7] p-4 text-left shadow-soft">
      <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-gold">
        {icon} {label}
      </p>
      <p className="mt-2 text-sm font-medium text-[#4a3c2e]">{value || "A definir"}</p>
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
