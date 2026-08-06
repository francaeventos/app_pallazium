import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getPartnerDetailFn, registerPartnerInterestFn, type PartnerDetail } from "@/fns/partners";
import { useMyEvent } from "@/hooks/use-my-event";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  Check,
  Globe,
  Handshake,
  Instagram,
  MessageCircle,
  Phone,
  Users,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/parceiros/$partnerId")({
  component: Page,
});

const statusLabels: Record<string, string> = {
  novo: "Interesse enviado",
  em_contato: "Equipe já te chamou",
  vendido: "Fechado",
  perdido: "Não avançou",
};

function Page() {
  const { partnerId } = Route.useParams();
  const { data: eventData } = useMyEvent();
  const [partner, setPartner] = useState<PartnerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [activePhoto, setActivePhoto] = useState<string | null>(null);

  const load = async () => {
    try {
      const { partner } = await getPartnerDetailFn({ data: { partnerId } });
      setPartner(partner);
      setActivePhoto(partner.image_url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Parceiro não encontrado.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId]);

  const showInterest = async () => {
    if (!partner) return;
    if (!eventData?.client || !eventData?.event) {
      return toast.error("Seu evento precisa estar vinculado para registrar interesse.");
    }
    setSending(true);
    try {
      await registerPartnerInterestFn({
        data: { partnerId: partner.id, eventId: eventData.event.id },
      });
      toast.success("Interesse enviado! A equipe Espaço Pallazium vai fazer a ponte com o parceiro.");
      setPartner({ ...partner, interest_status: "novo" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao registrar interesse";
      if (message === "DUPLICATE") {
        toast.info("Você já registrou interesse neste parceiro.");
      } else {
        toast.error(message);
      }
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="p-8 text-muted-foreground">Carregando…</div>;
  if (!partner) return null;

  const photos = [partner.image_url, ...partner.gallery_urls].filter(
    (url): url is string => Boolean(url),
  );
  const interested = Boolean(partner.interest_status);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-10">
      <Link
        to="/app/parceiros"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar aos parceiros
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-3">
          {activePhoto ? (
            <div
              className="aspect-[4/3] w-full rounded-2xl bg-muted bg-cover bg-center shadow-soft"
              style={{ backgroundImage: `url(${activePhoto})` }}
            />
          ) : (
            <div className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl bg-muted">
              <Users className="h-10 w-10 text-gold" />
            </div>
          )}
          {photos.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {photos.slice(0, 5).map((url, index) => (
                <button
                  key={`${url}-${index}`}
                  type="button"
                  onClick={() => setActivePhoto(url)}
                  className={`aspect-square rounded-lg bg-muted bg-cover bg-center transition ${
                    activePhoto === url ? "ring-2 ring-gold" : "opacity-80 hover:opacity-100"
                  }`}
                  style={{ backgroundImage: `url(${url})` }}
                  aria-label={`Ver foto ${index + 1}`}
                />
              ))}
            </div>
          )}

          {partner.description && (
            <Card className="mt-4">
              <CardContent className="p-5">
                <h2 className="font-serif text-xl">Sobre</h2>
                <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                  {partner.description}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="border-gold/20 shadow-soft">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center gap-3">
                {partner.logo_url ? (
                  <img
                    src={partner.logo_url}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-full border object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-champagne text-gold">
                    <Handshake className="h-6 w-6" />
                  </div>
                )}
                <div className="min-w-0">
                  <h1 className="truncate font-serif text-2xl leading-tight">{partner.name}</h1>
                  <Badge variant="outline" className="mt-1 text-xs capitalize">
                    {partner.category}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {partner.whatsapp && (
                  <Button asChild variant="outline">
                    <a
                      href={`https://wa.me/${onlyNumbers(partner.whatsapp)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Falar no WhatsApp
                    </a>
                  </Button>
                )}
                {partner.phone && (
                  <Button asChild variant="ghost">
                    <a href={`tel:${partner.phone}`}>
                      <Phone className="h-4 w-4" />
                      Ligar
                    </a>
                  </Button>
                )}
                {partner.instagram && (
                  <Button asChild variant="ghost">
                    <a href={instagramUrl(partner.instagram)} target="_blank" rel="noreferrer">
                      <Instagram className="h-4 w-4" />
                      Instagram
                    </a>
                  </Button>
                )}
                {partner.website_url && (
                  <Button asChild variant="ghost">
                    <a href={partner.website_url} target="_blank" rel="noreferrer">
                      <Globe className="h-4 w-4" />
                      Visitar site
                    </a>
                  </Button>
                )}
              </div>

              <Button
                size="lg"
                className="w-full"
                disabled={sending || interested}
                onClick={showInterest}
              >
                {interested ? (
                  <>
                    <Check className="h-4 w-4" />
                    {statusLabels[partner.interest_status ?? "novo"] ?? "Interesse enviado"}
                  </>
                ) : (
                  <>
                    <Handshake className="h-4 w-4" />
                    Tenho interesse
                  </>
                )}
              </Button>
              {!eventData?.event && !interested && (
                <p className="text-center text-xs text-muted-foreground">
                  Seu evento precisa estar vinculado para registrar interesse.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function onlyNumbers(value: string) {
  return value.replace(/\D/g, "");
}

function instagramUrl(value: string) {
  if (value.startsWith("http")) return value;
  return `https://instagram.com/${value.replace("@", "")}`;
}
