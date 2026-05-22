import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMyEvent } from "@/hooks/use-my-event";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, ChefHat, Plus, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/app/cardapios")({ component: Page });

type Menu = Database["public"]["Tables"]["menus"]["Row"];
type MenuInterest = Pick<
  Database["public"]["Tables"]["menu_interests"]["Row"],
  "menu_id" | "status"
>;

function Page() {
  const { data } = useMyEvent();
  const { role } = useAuth();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [interests, setInterests] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: menuRows } = await supabase
      .from("menus")
      .select("*")
      .eq("active", true)
      .order("category");
    setMenus(menuRows ?? []);

    if (data?.client && data.event) {
      const { data: interestRows } = await supabase
        .from("menu_interests")
        .select("menu_id, status")
        .eq("client_id", data.client.id)
        .eq("event_id", data.event.id);
      setInterests(
        new Map(
          ((interestRows ?? []) as MenuInterest[]).map((item) => [item.menu_id, item.status]),
        ),
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [data?.client?.id, data?.event?.id]);

  const chooseMenu = async (menuId: string) => {
    if (!data?.client || !data.event) return toast.error("Evento não vinculado.");
    const { error } = await supabase.from("menu_interests").insert({
      menu_id: menuId,
      client_id: data.client.id,
      event_id: data.event.id,
    });
    if (error) {
      if (error.code === "23505")
        return toast.info("Este cardápio já está registrado para o seu evento.");
      return toast.error(error.message);
    }
    toast.success("Interesse em cardápio registrado.");
    setInterests((current) => new Map(current).set(menuId, "novo"));
  };

  if (loading) return <div className="p-8 text-muted-foreground">Carregando…</div>;

  const byCat: Record<string, Menu[]> = {};
  menus.forEach((menu) => {
    (byCat[menu.category] ||= []).push(menu);
  });

  return (
    <div className="p-6 lg:p-10 space-y-8 max-w-6xl mx-auto">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Gastronomia</p>
        <h1 className="font-serif text-4xl mt-2">Cardápios disponíveis</h1>
        <p className="text-muted-foreground mt-2">
          Salve os cardápios que combinam com o seu evento para a equipe comercial acompanhar.
        </p>
      </div>

      {menus.length === 0 && (
        <Card className="border-gold/30 bg-card">
          <CardContent className="grid gap-6 p-6 sm:grid-cols-[auto_1fr_auto] sm:items-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-champagne text-gold">
              <ChefHat className="h-7 w-7" />
            </div>
            <div>
              <h2 className="font-serif text-2xl">Nenhum cardápio cadastrado ainda</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Os cardápios publicados pelo admin aparecem aqui para o cliente registrar interesse.
              </p>
            </div>
            {role === "admin" && (
              <Button asChild>
                <Link to="/admin/cardapios">
                  <Plus className="mr-2 h-4 w-4" />
                  Cadastrar cardápio
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {Object.entries(byCat).map(([cat, items]) => (
        <section key={cat}>
          <h2 className="font-serif text-2xl mb-4 capitalize">{cat}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((m) => (
              <Card key={m.id} className="overflow-hidden hover:shadow-luxe transition-shadow">
                {m.image_url ? (
                  <div
                    className="h-40 bg-muted bg-cover bg-center"
                    style={{ backgroundImage: `url(${m.image_url})` }}
                  />
                ) : (
                  <div className="h-40 bg-muted flex items-center justify-center">
                    <UtensilsCrossed className="h-8 w-8 text-gold" />
                  </div>
                )}
                <CardContent className="p-5 flex min-h-56 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-serif text-xl">{m.name}</h3>
                    <Badge variant="outline" className="text-xs capitalize">
                      {m.category}
                    </Badge>
                  </div>
                  {m.description && (
                    <p className="text-sm text-muted-foreground mt-2">{m.description}</p>
                  )}
                  {m.items && (
                    <p className="text-xs text-muted-foreground mt-3 border-t pt-3 whitespace-pre-line">
                      {m.items}
                    </p>
                  )}
                  {m.notes && <p className="text-xs text-muted-foreground mt-3">{m.notes}</p>}
                  <div className="mt-auto pt-4">
                    <Button
                      size="sm"
                      className="w-full"
                      variant={interests.has(m.id) ? "outline" : "default"}
                      disabled={interests.has(m.id) || !data?.event}
                      onClick={() => chooseMenu(m.id)}
                    >
                      {interests.has(m.id) ? (
                        <>
                          <Check className="h-3 w-3 mr-1" />
                          Registrado
                        </>
                      ) : (
                        "Tenho interesse"
                      )}
                    </Button>
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
