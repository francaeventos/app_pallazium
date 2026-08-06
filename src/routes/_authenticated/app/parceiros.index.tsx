import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listActivePartnersFn, type PartnerRow } from "@/fns/catalog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClientEmptyState } from "@/components/ClientEmptyState";
import { ChevronRight, MessageCircle, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/parceiros/")({ component: Page });

function Page() {
  const [items, setItems] = useState<PartnerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listActivePartnersFn()
      .then((data) => {
        setItems(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-muted-foreground">Carregando…</div>;

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Rede Pallazium</p>
        <h1 className="font-serif text-4xl mt-2">Parceiros recomendados</h1>
        <p className="text-muted-foreground mt-2">
          Fornecedores indicados para complementar a experiência do seu evento.
        </p>
      </div>

      {items.length === 0 && (
        <ClientEmptyState
          icon={Users}
          title="Rede de parceiros em curadoria"
          description="Os fornecedores recomendados serão exibidos aqui quando a equipe Pallazium publicar indicações alinhadas ao padrão do seu evento."
        />
      )}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((partner) => (
          <Card key={partner.id} className="overflow-hidden transition hover:shadow-soft">
            <Link to="/app/parceiros/$partnerId" params={{ partnerId: partner.id }}>
              {partner.image_url ? (
                <div
                  className="aspect-square w-full bg-muted bg-cover bg-center"
                  style={{ backgroundImage: `url(${partner.image_url})` }}
                />
              ) : (
                <div className="aspect-square w-full bg-muted flex items-center justify-center">
                  <Users className="h-8 w-8 text-gold" />
                </div>
              )}
            </Link>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {partner.logo_url && (
                    <img
                      src={partner.logo_url}
                      alt=""
                      className="h-8 w-8 shrink-0 rounded-full border object-cover"
                    />
                  )}
                  <Link
                    to="/app/parceiros/$partnerId"
                    params={{ partnerId: partner.id }}
                    className="min-w-0"
                  >
                    <h3 className="font-serif text-xl truncate hover:underline">{partner.name}</h3>
                  </Link>
                </div>
                <Badge variant="outline" className="text-xs capitalize shrink-0">
                  {partner.category}
                </Badge>
              </div>
              {partner.description && (
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {partner.description}
                </p>
              )}
              {partner.gallery_urls.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {partner.gallery_urls.slice(0, 4).map((image, index) => (
                    <div
                      key={`${image}-${index}`}
                      className="h-14 rounded-lg bg-muted bg-cover bg-center"
                      style={{ backgroundImage: `url(${image})` }}
                    />
                  ))}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {partner.whatsapp && (
                  <Button asChild size="sm" variant="outline">
                    <a
                      href={`https://wa.me/${onlyNumbers(partner.whatsapp)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageCircle className="h-3 w-3 mr-1" />
                      WhatsApp
                    </a>
                  </Button>
                )}
                <Button asChild size="sm">
                  <Link to="/app/parceiros/$partnerId" params={{ partnerId: partner.id }}>
                    Ver perfil
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function onlyNumbers(value: string) {
  return value.replace(/\D/g, "");
}
