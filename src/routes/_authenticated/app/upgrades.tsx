import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMyEvent } from "@/hooks/use-my-event";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Check } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/app/upgrades")({ component: Page });

type Upgrade = Database["public"]["Tables"]["upgrades"]["Row"];
type Interest = Pick<
  Database["public"]["Tables"]["upgrade_interests"]["Row"],
  "upgrade_id" | "status"
>;

function Page() {
  const { data } = useMyEvent();
  const [upgrades, setUpgrades] = useState<Upgrade[]>([]);
  const [interests, setInterests] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data: ups } = await supabase
      .from("upgrades")
      .select("*")
      .eq("active", true)
      .order("category");
    setUpgrades(ups ?? []);
    if (data?.client && data.event) {
      const { data: ints } = await supabase
        .from("upgrade_interests")
        .select("upgrade_id, status")
        .eq("client_id", data.client.id)
        .eq("event_id", data.event.id);
      setInterests(new Map(((ints ?? []) as Interest[]).map((i) => [i.upgrade_id, i.status])));
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [data?.client?.id]);

  const showInterest = async (upgradeId: string) => {
    if (!data?.client || !data?.event) return toast.error("Evento não vinculado");
    const { error } = await supabase.from("upgrade_interests").insert({
      upgrade_id: upgradeId,
      client_id: data.client.id,
      event_id: data.event.id,
    });
    if (error) {
      if (error.code === "23505") return toast.info("Este interesse já foi registrado.");
      return toast.error(error.message);
    }
    toast.success("Interesse registrado! Nossa equipe entrará em contato.");
    setInterests((current) => new Map(current).set(upgradeId, "novo"));
  };

  if (loading) return <div className="p-8 text-muted-foreground">Carregando…</div>;

  return (
    <div className="p-6 lg:p-10 space-y-6 max-w-6xl mx-auto">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Eleve sua festa</p>
        <h1 className="font-serif text-4xl mt-2">Upgrades e experiências</h1>
        <p className="text-muted-foreground mt-2">Deixe sua celebração ainda mais inesquecível.</p>
        {!data?.event && (
          <p className="text-sm text-rose mt-2">
            Seu evento precisa estar vinculado para registrar interesses.
          </p>
        )}
      </div>

      {upgrades.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Em breve teremos opções de upgrades.
          </CardContent>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {upgrades.map((u) => {
          const status = interests.get(u.id);
          const has = Boolean(status);
          return (
            <Card
              key={u.id}
              className="overflow-hidden flex flex-col hover:shadow-luxe transition-shadow"
            >
              {u.image_url ? (
                <div
                  className="h-40 bg-cover bg-center"
                  style={{ backgroundImage: `url(${u.image_url})` }}
                />
              ) : (
                <div className="h-40 bg-gradient-luxe flex items-center justify-center">
                  <Sparkles className="h-8 w-8 text-gold" />
                </div>
              )}
              <CardContent className="p-5 flex-1 flex flex-col">
                <Badge variant="outline" className="text-xs capitalize w-fit mb-2">
                  {u.category}
                </Badge>
                <h3 className="font-serif text-xl">{u.name}</h3>
                {u.description && (
                  <p className="text-sm text-muted-foreground mt-2 flex-1">{u.description}</p>
                )}
                <div className="mt-4 flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-gold">
                    {u.price_text || "Consultar"}
                  </span>
                  <Button
                    size="sm"
                    disabled={has}
                    onClick={() => showInterest(u.id)}
                    variant={has ? "outline" : "default"}
                  >
                    {has ? (
                      <>
                        <Check className="h-3 w-3 mr-1" /> {statusLabel(status)}
                      </>
                    ) : (
                      "Tenho interesse"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function statusLabel(status?: string) {
  const labels: Record<string, string> = {
    novo: "Registrado",
    em_contato: "Em contato",
    vendido: "Contratado",
    perdido: "Encerrado",
  };
  return labels[status ?? ""] ?? "Registrado";
}
