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
import { Calendar, CheckCircle2, MapPin, Users, XCircle } from "lucide-react";
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

  return (
    <main className="pallazium-invitation-shell min-h-screen">
      <section className="pallazium-invitation-hero relative overflow-hidden">
        {details.cover_image_url && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-45"
            style={{ backgroundImage: `url(${details.cover_image_url})` }}
          />
        )}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(144,117,84,0.22),transparent_34rem)]" />
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

      <section className="mx-auto max-w-6xl px-6 pb-12">
        <Card className="pallazium-invitation-card">
          <CardContent className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
            <InfoBox label="Cerimônia" value={details.ceremony_location} />
            <InfoBox label="Recepção" value={details.reception_location} />
            <InfoBox label="Dress code" value={details.dress_code} />
            <InfoBox
              label="Mapa"
              value={details.map_url ? "Abrir localização" : "A definir"}
              href={details.map_url}
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
