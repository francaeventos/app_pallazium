import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listActiveTipsFn, type TipRow } from "@/fns/catalog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClientEmptyState } from "@/components/ClientEmptyState";
import { Lightbulb } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/dicas")({ component: Page });

function Page() {
  const [items, setItems] = useState<TipRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listActiveTipsFn()
      .then((data) => {
        setItems(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-muted-foreground">Carregando…</div>;

  const byCategory: Record<string, TipRow[]> = {};
  items.forEach((item) => {
    (byCategory[item.category] ||= []).push(item);
  });

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Curadoria</p>
        <h1 className="font-serif text-4xl mt-2">Dicas para o seu evento</h1>
        <p className="text-muted-foreground mt-2">
          Orientações práticas para deixar cada decisão mais simples.
        </p>
      </div>

      {items.length === 0 && (
        <ClientEmptyState
          icon={Lightbulb}
          title="Dicas em organização"
          description="As orientações da equipe serão publicadas aqui para apoiar suas próximas decisões e manter o planejamento do evento bem alinhado."
        />
      )}

      {Object.entries(byCategory).map(([category, tips]) => (
        <section key={category} className="space-y-4">
          <h2 className="font-serif text-2xl capitalize">{category}</h2>
          <div className="grid lg:grid-cols-2 gap-4">
            {tips.map((tip) => (
              <Card key={tip.id} className="overflow-hidden">
                <div className="grid sm:grid-cols-[180px_1fr]">
                  {tip.image_url ? (
                    <div
                      className="min-h-44 bg-muted bg-cover bg-center"
                      style={{ backgroundImage: `url(${tip.image_url})` }}
                    />
                  ) : (
                    <div className="min-h-44 bg-muted flex items-center justify-center">
                      <Lightbulb className="h-8 w-8 text-gold" />
                    </div>
                  )}
                  <CardContent className="p-5">
                    <Badge variant="outline" className="text-xs capitalize mb-3">
                      {tip.category}
                    </Badge>
                    <h3 className="font-serif text-xl">{tip.title}</h3>
                    <p className="text-sm text-muted-foreground mt-3 whitespace-pre-line">
                      {tip.content}
                    </p>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
