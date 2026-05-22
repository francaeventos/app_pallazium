import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Instagram, MessageCircle, Phone, Users } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/app/parceiros")({ component: Page });

type Partner = Database["public"]["Tables"]["partners"]["Row"];

function Page() {
  const [items, setItems] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("partners")
      .select("*")
      .eq("active", true)
      .order("category")
      .then(({ data }) => {
        setItems(data ?? []);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8 text-muted-foreground">Carregando…</div>;

  const byCategory: Record<string, Partner[]> = {};
  items.forEach((item) => {
    (byCategory[item.category] ||= []).push(item);
  });

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
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Nenhum parceiro disponível no momento.
          </CardContent>
        </Card>
      )}

      {Object.entries(byCategory).map(([category, partners]) => (
        <section key={category} className="space-y-4">
          <h2 className="font-serif text-2xl capitalize">{category}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {partners.map((partner) => (
              <Card key={partner.id} className="overflow-hidden">
                {partner.image_url ? (
                  <div
                    className="h-40 bg-muted bg-cover bg-center"
                    style={{ backgroundImage: `url(${partner.image_url})` }}
                  />
                ) : (
                  <div className="h-40 bg-muted flex items-center justify-center">
                    <Users className="h-8 w-8 text-gold" />
                  </div>
                )}
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-serif text-xl">{partner.name}</h3>
                    <Badge variant="outline" className="text-xs capitalize">
                      {partner.category}
                    </Badge>
                  </div>
                  {partner.description && (
                    <p className="text-sm text-muted-foreground">{partner.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
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
                    {partner.phone && (
                      <Button asChild size="sm" variant="ghost">
                        <a href={`tel:${partner.phone}`}>
                          <Phone className="h-3 w-3 mr-1" />
                          Ligar
                        </a>
                      </Button>
                    )}
                    {partner.instagram && (
                      <Button asChild size="sm" variant="ghost">
                        <a href={instagramUrl(partner.instagram)} target="_blank" rel="noreferrer">
                          <Instagram className="h-3 w-3 mr-1" />
                          Instagram
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}
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
