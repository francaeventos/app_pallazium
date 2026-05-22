import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/app/cardapios")({ component: Page });

function Page() {
  const [menus, setMenus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("menus").select("*").eq("active", true).order("category").then(({ data }) => {
      setMenus(data ?? []);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-8 text-muted-foreground">Carregando…</div>;

  const byCat: Record<string, any[]> = {};
  menus.forEach((m) => { (byCat[m.category] ||= []).push(m); });

  return (
    <div className="p-6 lg:p-10 space-y-8 max-w-6xl mx-auto">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Gastronomia</p>
        <h1 className="font-serif text-4xl mt-2">Cardápios disponíveis</h1>
      </div>

      {menus.length === 0 && (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Cardápios em breve.</CardContent></Card>
      )}

      {Object.entries(byCat).map(([cat, items]) => (
        <section key={cat}>
          <h2 className="font-serif text-2xl mb-4 capitalize">{cat}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((m) => (
              <Card key={m.id} className="overflow-hidden hover:shadow-luxe transition-shadow">
                {m.image_url && <div className="h-40 bg-muted bg-cover bg-center" style={{ backgroundImage: `url(${m.image_url})` }} />}
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-serif text-xl">{m.name}</h3>
                    <Badge variant="outline" className="text-xs capitalize">{m.category}</Badge>
                  </div>
                  {m.description && <p className="text-sm text-muted-foreground mt-2">{m.description}</p>}
                  {m.items && <p className="text-xs text-muted-foreground mt-3 border-t pt-3">{m.items}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
