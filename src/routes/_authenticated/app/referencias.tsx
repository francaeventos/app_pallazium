import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClientEmptyState } from "@/components/ClientEmptyState";
import { ExternalLink, Images } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/app/referencias")({ component: Page });

type Reference = Database["public"]["Tables"]["event_references"]["Row"] & {
  events?: {
    event_type: string;
    event_date: string | null;
    clients?: { full_name: string } | null;
  } | null;
};

function Page() {
  const [items, setItems] = useState<Reference[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: refs } = await supabase
      .from("event_references")
      .select("*, events(event_type, event_date, clients(full_name))")
      .order("created_at", { ascending: false });
    setItems((refs ?? []) as Reference[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const groupedItems = useMemo(() => groupReferencesByEventLevel(items), [items]);

  if (loading) return <div className="p-8 text-muted-foreground">Carregando…</div>;

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          Biblioteca Pallazium
        </p>
        <h1 className="font-serif text-4xl mt-2">Referências por nível de evento</h1>
        <p className="text-muted-foreground mt-2">
          Inspirações liberadas para todos os clientes, organizadas pelo tipo de evento.
        </p>
      </div>

      {items.length === 0 && (
        <ClientEmptyState
          icon={Images}
          title="Referências em curadoria"
          description="A equipe Pallazium publicará referências por nível de evento para inspirar escolhas de decoração, estilo e experiência."
        />
      )}

      {Object.entries(groupedItems).map(([eventLevel, references]) => (
        <section key={eventLevel} className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-serif text-2xl capitalize">{eventLevel}</h2>
            <Badge variant="outline">{references.length} referência(s)</Badge>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {references.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                {item.image_url ? (
                  <div
                    className="h-44 bg-muted bg-cover bg-center"
                    style={{ backgroundImage: `url(${item.image_url})` }}
                  />
                ) : (
                  <div className="h-44 bg-muted flex items-center justify-center">
                    <Images className="h-8 w-8 text-gold" />
                  </div>
                )}
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-serif text-xl">{item.title}</h2>
                    <Badge variant="outline" className="text-xs capitalize">
                      {item.category}
                    </Badge>
                  </div>
                  {item.notes && <p className="text-sm text-muted-foreground">{item.notes}</p>}
                  <div className="flex flex-wrap gap-2">
                    {item.inspiration_link && (
                      <Button asChild variant="outline" size="sm">
                        <a href={item.inspiration_link} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Abrir link
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

function groupReferencesByEventLevel(items: Reference[]) {
  return items.reduce<Record<string, Reference[]>>((acc, item) => {
    const eventLevel = item.events?.event_type || "Outros eventos";
    (acc[eventLevel] ||= []).push(item);
    return acc;
  }, {});
}
