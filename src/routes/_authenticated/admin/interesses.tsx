import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/interesses")({ component: Page });

function Page() {
  const [list, setList] = useState<any[]>([]);

  const load = async () => {
    const { data } = await supabase
      .from("upgrade_interests")
      .select("*, upgrades(name, category), clients(full_name, email, whatsapp), events(event_type, event_date)")
      .order("created_at", { ascending: false });
    setList(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("upgrade_interests").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Atualizado"); load(); }
  };

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Comercial</p>
        <h1 className="font-serif text-4xl mt-2">Interesses em upgrades</h1>
      </div>
      <Card>
        <CardHeader><CardTitle className="font-serif text-xl">Pipeline</CardTitle></CardHeader>
        <CardContent className="divide-y">
          {list.length === 0 && <p className="text-sm text-muted-foreground py-2">Nenhum interesse ainda.</p>}
          {list.map((i) => (
            <div key={i.id} className="py-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">{i.upgrades?.name} <Badge variant="outline" className="text-xs ml-2 capitalize">{i.upgrades?.category}</Badge></p>
                <p className="text-xs text-muted-foreground mt-1">
                  {i.clients?.full_name} • {i.clients?.email}{i.clients?.whatsapp && ` • ${i.clients.whatsapp}`}
                </p>
                <p className="text-xs text-muted-foreground capitalize">{i.events?.event_type} • {i.events?.event_date} • registrado {format(new Date(i.created_at), "dd/MM/yyyy")}</p>
              </div>
              <Select value={i.status} onValueChange={(v) => updateStatus(i.id, v)}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="novo">Novo</SelectItem>
                  <SelectItem value="em_contato">Em contato</SelectItem>
                  <SelectItem value="vendido">Vendido</SelectItem>
                  <SelectItem value="perdido">Perdido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
