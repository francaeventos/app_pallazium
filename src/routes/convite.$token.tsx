import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getInvitationGuestByTokenFn,
  getPublicEventGiftItemsByTokenFn,
  releaseEventGiftItemReservationFn,
  reserveEventGiftItemFn,
  respondInvitationGuestFn,
  type PublicGiftItem,
  type PublicInvitationGuest,
} from "@/fns/invitation-public";
import { rsvpStatusLabels } from "@/lib/invitation-utils";
import { PALLAZIUM_ADDRESS, PALLAZIUM_MAP_URL } from "@/lib/pallazium-venue";
import { Calendar, CheckCircle2, Gift, MapPin, Navigation, Users, XCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/convite/$token")({ component: Page });

function formatDateBr(value?: string | null) {
  if (!value) return value ?? null;
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function Page() {
  const { token } = Route.useParams();
  const [details, setDetails] = useState<PublicInvitationGuest | null>(null);
  const [companions, setCompanions] = useState(0);
  const [giftItems, setGiftItems] = useState<PublicGiftItem[]>([]);
  const [selectedGiftImage, setSelectedGiftImage] = useState<PublicGiftItem | null>(null);
  const [reservingGiftId, setReservingGiftId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const row = await getInvitationGuestByTokenFn({ data: { guestToken: token } });
      if (!row) {
        setDetails(null);
        setLoading(false);
        return;
      }

      setDetails(row);
      setCompanions(row.confirmed_companions);
      const gifts = await getPublicEventGiftItemsByTokenFn({ data: { guestToken: token } });
      setGiftItems(gifts);
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
      const updated = await respondInvitationGuestFn({
        data: {
          guestToken: token,
          rsvpStatus: status,
          confirmedCompanions: status === "confirmado" ? companions : 0,
          dietaryRestrictions: null,
        },
      });
      setDetails(updated);
      setCompanions(updated.confirmed_companions);
      toast.success(status === "confirmado" ? "Presença confirmada" : "Resposta registrada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível registrar a resposta.");
    }
  };

  const reserveGiftItem = async (item: PublicGiftItem) => {
    setReservingGiftId(item.id);
    try {
      const updated = await reserveEventGiftItemFn({
        data: { guestToken: token, giftItemId: item.id },
      });
      setGiftItems((current) =>
        current.map((giftItem) => (giftItem.id === item.id ? updated : giftItem)),
      );
      toast.success("Presente reservado para você");
    } catch (error) {
      await load();
      toast.error(
        error instanceof Error
          ? error.message
          : "Este presente acabou de ser escolhido por outro convidado.",
      );
    } finally {
      setReservingGiftId(null);
    }
  };

  const releaseGiftItemReservation = async (item: PublicGiftItem) => {
    setReservingGiftId(item.id);
    try {
      const updated = await releaseEventGiftItemReservationFn({
        data: { guestToken: token, giftItemId: item.id },
      });
      setGiftItems((current) =>
        current.map((giftItem) => (giftItem.id === item.id ? updated : giftItem)),
      );
      toast.success("Reserva cancelada");
    } catch (error) {
      await load();
      toast.error(
        error instanceof Error ? error.message : "Não foi possível cancelar a reserva deste presente.",
      );
    } finally {
      setReservingGiftId(null);
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
              label="Data"
              value={formatDateBr(details.event_date)}
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
                  Visualize as opções antes de decidir. Quando escolher, clique em reservar para
                  esse presente sair da lista dos outros convidados.
                </p>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-champagne text-gold">
                <Gift className="h-5 w-5" />
              </div>
            </div>
            {giftItems.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {giftItems.map((item) => {
                  const reservedByCurrentGuest = item.reserved_by_guest_id === details.guest_id;

                  return (
                    <div
                      key={item.id}
                      className={`rounded-2xl border p-5 shadow-soft ${
                        reservedByCurrentGuest
                          ? "border-gold/40 bg-champagne/45"
                          : "bg-background/80"
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
                        {reservedByCurrentGuest && (
                          <Badge variant="outline" className="border-gold/50 text-gold">
                            Reservado por você
                          </Badge>
                        )}
                      </div>
                      {item.notes && (
                        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                          {item.notes}
                        </p>
                      )}
                      {reservedByCurrentGuest ? (
                        <div className="mt-4 space-y-3">
                          <p className="rounded-xl border border-gold/30 bg-white/70 px-4 py-3 text-sm text-muted-foreground">
                            Este presente já ficou reservado para você e não aparece para outros
                            convidados.
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={reservingGiftId === item.id}
                            onClick={() => releaseGiftItemReservation(item)}
                          >
                            {reservingGiftId === item.id ? "Cancelando..." : "Cancelar reserva"}
                          </Button>
                        </div>
                      ) : (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {item.reference_links.length > 0 &&
                            item.reference_links.map((link, index) => (
                              <Button key={link} asChild size="sm" variant="outline">
                                <a href={link} target="_blank" rel="noreferrer">
                                  Visualizar {index + 1}
                                </a>
                              </Button>
                            ))}
                          <Button
                            size="sm"
                            disabled={reservingGiftId === item.id}
                            onClick={() => reserveGiftItem(item)}
                          >
                            {reservingGiftId === item.id ? "Reservando..." : "Reservar presente"}
                          </Button>
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
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
}) {
  return (
    <div className="rounded-xl border border-gold/45 bg-[#fffaf7] p-6 text-center shadow-soft">
      <p className="flex items-center justify-center gap-2 text-xs uppercase tracking-wider text-gold">
        {icon} {label}
      </p>
      <p className="mt-3 text-base font-medium leading-snug text-[#4a3c2e] sm:text-lg">
        {value || "A definir"}
      </p>
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
