import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClientEmptyState } from "@/components/ClientEmptyState";
import { Images } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/app/portfolio")({ component: Page });

type PortfolioItem = Database["public"]["Tables"]["portfolio_items"]["Row"];

function Page() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("portfolio_items")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setItems(data ?? []);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8 text-muted-foreground">Carregando…</div>;

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Inspiração real</p>
        <h1 className="font-serif text-4xl mt-2">Portfólio Pallazium</h1>
        <p className="text-muted-foreground mt-2">
          Eventos realizados para inspirar escolhas de decoração, gastronomia e experiência.
        </p>
      </div>

      {items.length === 0 && (
        <ClientEmptyState
          icon={Images}
          title="Portfólio em curadoria"
          description="A seleção de eventos realizados será publicada aqui para inspirar escolhas de estilo, decoração, gastronomia e experiência."
        />
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => {
          const cover = item.images?.[0];
          return (
            <Card key={item.id} className="overflow-hidden">
              {cover ? (
                <div
                  className="h-48 bg-muted bg-cover bg-center"
                  style={{ backgroundImage: `url(${cover})` }}
                />
              ) : (
                <div className="h-48 bg-muted flex items-center justify-center">
                  <Images className="h-8 w-8 text-gold" />
                </div>
              )}
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-serif text-xl">{item.event_name}</h2>
                  <Badge variant="outline" className="text-xs capitalize">
                    {item.category}
                  </Badge>
                </div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {item.event_type}
                </p>
                {item.description && (
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                )}
                {item.highlights && (
                  <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                    {item.highlights}
                  </p>
                )}
                {item.images && item.images.length > 1 && (
                  <div className="grid grid-cols-3 gap-2">
                    {item.images.slice(1, 4).map((image) => (
                      <div
                        key={image}
                        className="h-16 rounded-md bg-muted bg-cover bg-center"
                        style={{ backgroundImage: `url(${image})` }}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
