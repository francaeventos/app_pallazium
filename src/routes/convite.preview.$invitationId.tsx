import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  getInvitationPreviewFn,
  getPublicEventGiftItemsByInvitationFn,
  type PublicGiftItem,
  type PublicInvitationPreview,
} from "@/fns/invitation-public";
import { PALLAZIUM_ADDRESS, PALLAZIUM_MAP_URL } from "@/lib/pallazium-venue";
import { Calendar, Gift, MapPin, Navigation, Users } from "lucide-react";

export const Route = createFileRoute("/convite/preview/$invitationId")({ component: Page });

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
  const { invitationId } = Route.useParams();
  const [details, setDetails] = useState<PublicInvitationPreview | null>(null);
  const [giftItems, setGiftItems] = useState<PublicGiftItem[]>([]);
  const [selectedGiftImage, setSelectedGiftImage] = useState<PublicGiftItem | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const row = await getInvitationPreviewFn({ data: { invitationId } });
      if (!row) {
        setDetails(null);
        setLoading(false);
        return;
      }

      setDetails(row);
      const gifts = await getPublicEventGiftItemsByInvitationFn({ data: { invitationId } });
      setGiftItems(gifts);
    } catch (error) {
      console.error("Erro ao carregar convite", error);
      setDetails(null);
    } finally {
      setLoading(false);
    }
  }, [invitationId]);

  useEffect(() => {
    load();
  }, [load]);

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
              Este convite não está publicado ou não é válido.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const addressForMap = details.reception_location || details.event_location || "";
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

      <section className="mx-auto max-w-6xl px-6 py-10">
        <Card className="pallazium-invitation-card">
          <CardContent className="p-6 text-center">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Convite de demonstração
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Esta é uma prévia geral do convite. Para confirmar presença, use o link individual
              enviado pela organização a cada convidado.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-12">
        <Card className="pallazium-invitation-card overflow-hidden">
          <CardContent className="grid gap-0 p-0 md:grid-cols-[1fr_0.9fr]">
            <div className="space-y-4 p-6">
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                Como chegar
              </p>
              <h2 className="font-serif text-3xl">Localização do evento</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoBox
                  label="Cerimônia"
                  value={details.ceremony_external ? details.ceremony_location : "Espaço Pallazium"}
                  address={details.ceremony_external ? details.ceremony_address : PALLAZIUM_ADDRESS}
                  href={details.ceremony_external ? details.ceremony_map_url : PALLAZIUM_MAP_URL}
                />
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
          <CardContent className="space-y-6 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                  Lista de presentes
                </p>
                <h2 className="mt-2 font-serif text-4xl">Presentes</h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Visualize as opções cadastradas. Para reservar um presente, acesse pelo seu link
                  individual de convidado.
                </p>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-champagne text-gold">
                <Gift className="h-5 w-5" />
              </div>
            </div>
            {giftItems.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {giftItems.map((item) => {
                  const reserved = Boolean(item.reserved_by_guest_id);

                  return (
                    <div
                      key={item.id}
                      className={`rounded-2xl border p-5 shadow-soft ${
                        reserved ? "border-gold/40 bg-champagne/45" : "bg-background/80"
                      }`}
                    >
                      {item.image_url && (
                        <button
                          type="button"
                          className="-mx-5 -mt-5 mb-5 block aspect-[4/3] w-[calc(100%+2.5rem)] overflow-hidden rounded-t-2xl border-b bg-muted text-left"
                          onClick={() => setSelectedGiftImage(item)}
                        >
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="h-full w-full object-cover transition duration-300 hover:scale-[1.03]"
                          />
                        </button>
                      )}
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="font-serif text-2xl leading-tight text-[#4a3c2e]">
                          {item.name}
                        </p>
                        {reserved && (
                          <Badge variant="outline" className="border-gold/50 text-gold">
                            Reservado
                          </Badge>
                        )}
                      </div>
                      {item.notes && (
                        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                          {item.notes}
                        </p>
                      )}
                      {item.reference_links.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {item.reference_links.map((link, index) => (
                            <Button key={link} asChild size="sm" variant="outline">
                              <a href={link} target="_blank" rel="noreferrer">
                                Visualizar {index + 1}
                              </a>
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : details.gift_list_url ? (
              <Button asChild variant="outline">
                <a href={details.gift_list_url} target="_blank" rel="noreferrer">
                  <Gift className="mr-2 h-4 w-4" />
                  Abrir lista externa
                </a>
              </Button>
            ) : (
              <p className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
                Lista de presentes ainda não informada.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <GiftImageDialog item={selectedGiftImage} onClose={() => setSelectedGiftImage(null)} />
    </main>
  );
}

function GiftImageDialog({
  item,
  onClose,
}: {
  item: PublicGiftItem | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        {item?.image_url && (
          <>
            <DialogHeader>
              <DialogTitle className="font-serif text-3xl">{item.name}</DialogTitle>
            </DialogHeader>
            <div className="overflow-hidden rounded-2xl border bg-muted">
              <img
                src={item.image_url}
                alt={item.name}
                className="max-h-[72vh] w-full object-contain"
              />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
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
