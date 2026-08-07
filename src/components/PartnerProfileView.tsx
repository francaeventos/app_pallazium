import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Globe, Handshake, Instagram, MessageCircle, Phone, Users } from "lucide-react";

export type PartnerProfileData = {
  name: string;
  category: string;
  description: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  website_url: string | null;
  image_url: string | null;
  logo_url: string | null;
  gallery_urls: string[];
};

export function PartnerProfileView({
  partner,
  backTo,
  backLabel = "Voltar",
  cta,
}: {
  partner: PartnerProfileData;
  backTo?: string;
  backLabel?: string;
  cta?: ReactNode;
}) {
  const photos = [partner.image_url, ...partner.gallery_urls].filter(
    (url): url is string => Boolean(url),
  );
  const [activePhoto, setActivePhoto] = useState<string | null>(partner.image_url);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {backTo && (
        <Link
          to={backTo}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
      )}

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="order-1 space-y-3 lg:col-start-1 lg:row-start-1 lg:row-span-2">
          {activePhoto ? (
            <div
              className="aspect-square w-full rounded-2xl bg-muted bg-cover bg-center shadow-soft"
              style={{ backgroundImage: `url(${activePhoto})` }}
            />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center rounded-2xl bg-muted">
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
        </div>

        <div className="order-3 lg:order-none lg:col-start-2 lg:row-start-1">
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

              {cta}
            </CardContent>
          </Card>
        </div>

        {partner.description && (
          <div className="order-2 lg:order-none lg:col-start-2 lg:row-start-2">
            <Card>
              <CardContent className="p-5">
                <h2 className="font-serif text-xl">Sobre</h2>
                <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                  {partner.description}
                </p>
              </CardContent>
            </Card>
          </div>
        )}
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
