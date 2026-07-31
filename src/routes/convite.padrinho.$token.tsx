import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  getInvitationPartyMemberByTokenFn,
  respondInvitationPartyMemberFn,
  type PublicInvitationPartyMember,
} from "@/fns/invitation-public";
import { rsvpStatusLabels } from "@/lib/invitation-utils";
import { PALLAZIUM_ADDRESS } from "@/lib/pallazium-venue";
import { Calendar, CheckCircle2, MapPin, Users, XCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/convite/padrinho/$token")({ component: Page });

function formatDateBr(value?: string | null) {
  if (!value) return value ?? null;
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function formatTimeBr(value?: string | null) {
  if (!value) return null;
  const [hour, minute] = value.split(":");
  if (!hour || !minute) return value;
  return `${hour}:${minute}`;
}

function Page() {
  const { token } = Route.useParams();
  const [details, setDetails] = useState<PublicInvitationPartyMember | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const row = await getInvitationPartyMemberByTokenFn({ data: { memberToken: token } });
      setDetails(row);
    } catch (error) {
      console.error("Erro ao carregar convite", error);
      setDetails(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const respond = async (status: "confirmado" | "recusado") => {
    if (!details) return toast.error("Convite indisponível.");
    try {
      const updated = await respondInvitationPartyMemberFn({
        data: { memberToken: token, rsvpStatus: status },
      });
      setDetails(updated);
      toast.success(status === "confirmado" ? "Presença confirmada" : "Resposta registrada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível registrar a resposta.");
    }
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

  const ceremonyAddressForMap = details.ceremony_address || details.ceremony_location || "";
  const ceremonyMapEmbedUrl = ceremonyAddressForMap
    ? `https://maps.google.com/maps?q=${encodeURIComponent(ceremonyAddressForMap)}&output=embed`
    : null;

  const receptionAddressForMap = details.reception_location || PALLAZIUM_ADDRESS;
  const receptionMapEmbedUrl = receptionAddressForMap
    ? `https://maps.google.com/maps?q=${encodeURIComponent(receptionAddressForMap)}&output=embed`
    : null;

  return (
    <main className="pallazium-invitation-shell min-h-screen">
      <section className="pallazium-invitation-hero relative overflow-hidden">
        {details.cover_image_url && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-75"
            style={{ backgroundImage: `url(${details.cover_image_url})` }}
          />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(43,36,28,0.55),rgba(43,36,28,0.45)),radial-gradient(circle_at_center,rgba(144,117,84,0.2),transparent_34rem)]" />
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
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Info
              icon={<Calendar className="h-4 w-4" />}
              label="Data e horário"
              value={formatDateBr(details.event_date)}
              secondaryValue={formatTimeBr(details.start_time)}
            />
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
                Este link é exclusivo para o padrinho/madrinha abaixo. Ele não exibe a lista
                completa do evento.
              </p>
            </div>
            <div className="rounded-2xl border border-gold/30 bg-champagne/60 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                    Padrinho / Madrinha
                  </p>
                  <p className="mt-2 font-serif text-3xl">{details.party_member_name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {details.role} {details.side && `• ${details.side}`}
                  </p>
                  {details.attire && (
                    <p className="mt-1 text-sm text-muted-foreground">Traje: {details.attire}</p>
                  )}
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
              <h2 className="mt-2 font-serif text-3xl">{details.party_member_name}</h2>
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
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-12">
        {details.ceremony_external ? (
          <>
            <LocationCard
              eyebrow="Como chegar ao local da cerimônia"
              title={details.ceremony_location || "Local da cerimônia"}
              mapEmbedUrl={ceremonyMapEmbedUrl}
              mapTitle="Mapa da cerimônia"
            >
              <InfoBox
                label="Cerimônia"
                value={details.ceremony_location}
                address={details.ceremony_address}
                href={details.ceremony_map_url}
              />
            </LocationCard>

            <LocationCard
              eyebrow="Como chegar ao local da recepção"
              title="Espaço Pallazium"
              mapEmbedUrl={receptionMapEmbedUrl}
              mapTitle="Mapa da recepção"
            >
              <InfoBox label="Recepção" value={details.reception_location} />
            </LocationCard>
          </>
        ) : (
          <LocationCard
            eyebrow="Como chegar ao local da cerimônia e recepção"
            title="Espaço Pallazium"
            mapEmbedUrl={receptionMapEmbedUrl}
            mapTitle="Mapa do evento"
          >
            <InfoBox label="Cerimônia e recepção" value={PALLAZIUM_ADDRESS} />
          </LocationCard>
        )}
      </section>
    </main>
  );
}

function Info({
  icon,
  label,
  value,
  secondaryValue,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
  secondaryValue?: string | null;
}) {
  return (
    <div className="rounded-xl border border-gold/45 bg-[#fffaf7] p-6 text-center shadow-soft">
      <p className="flex items-center justify-center gap-2 text-xs uppercase tracking-wider text-gold">
        {icon} {label}
      </p>
      <p className="mt-3 text-base font-medium leading-snug text-[#4a3c2e] sm:text-lg">
        {value || "A definir"}
      </p>
      {secondaryValue && (
        <p className="mt-1 text-base font-medium leading-snug text-[#4a3c2e] sm:text-lg">
          {secondaryValue}
        </p>
      )}
    </div>
  );
}

function InfoBox({
  label,
  value,
  address,
  href,
}: {
  label: string;
  value?: string | null;
  address?: string | null;
  href?: string | null;
}) {
  return (
    <div className="rounded-xl border p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-medium">{value || "A definir"}</p>
      {address && <p className="mt-1 text-sm text-muted-foreground">{address}</p>}
      {href && (
        <a
          className="mt-2 inline-block text-xs font-medium text-gold underline"
          href={href}
          target="_blank"
          rel="noreferrer"
        >
          Abrir mapa
        </a>
      )}
    </div>
  );
}

function LocationCard({
  eyebrow,
  title,
  mapEmbedUrl,
  mapTitle,
  children,
}: {
  eyebrow: string;
  title: string;
  mapEmbedUrl: string | null;
  mapTitle: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="pallazium-invitation-card overflow-hidden">
      <CardContent className="grid gap-0 p-0 md:grid-cols-[1fr_0.9fr]">
        <div className="space-y-4 p-6">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{eyebrow}</p>
          <h2 className="font-serif text-3xl">{title}</h2>
          {children}
        </div>
        {mapEmbedUrl ? (
          <iframe
            title={mapTitle}
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
  );
}
