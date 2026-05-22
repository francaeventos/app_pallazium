import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/admin/interesses")({ component: Page });

type InterestStatus = Database["public"]["Enums"]["interest_status"];
type UpgradeInterest = Database["public"]["Tables"]["upgrade_interests"]["Row"] & {
  upgrades: { name: string; category: string } | null;
  clients: { full_name: string; email: string; whatsapp: string | null } | null;
  events: { event_type: string; event_date: string | null } | null;
};
type MenuInterest = Database["public"]["Tables"]["menu_interests"]["Row"] & {
  menus: { name: string; category: string } | null;
  clients: { full_name: string; email: string; whatsapp: string | null } | null;
  events: { event_type: string; event_date: string | null } | null;
};

function Page() {
  const [list, setList] = useState<UpgradeInterest[]>([]);
  const [menuList, setMenuList] = useState<MenuInterest[]>([]);

  const load = async () => {
    const [{ data }, { data: menus }] = await Promise.all([
      supabase
        .from("upgrade_interests")
        .select(
          "*, upgrades(name, category), clients(full_name, email, whatsapp), events(event_type, event_date)",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("menu_interests")
        .select(
          "*, menus(name, category), clients(full_name, email, whatsapp), events(event_type, event_date)",
        )
        .order("created_at", { ascending: false }),
    ]);
    setList((data ?? []) as UpgradeInterest[]);
    setMenuList((menus ?? []) as MenuInterest[]);
  };
  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("upgrade_interests")
      .update({ status: status as InterestStatus })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Atualizado");
      load();
    }
  };

  const updateMenuStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("menu_interests")
      .update({ status: status as InterestStatus })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Atualizado");
      load();
    }
  };

  const removeUpgradeInterest = async (id: string) => {
    const { error } = await supabase.from("upgrade_interests").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Interesse removido");
    load();
  };

  const removeMenuInterest = async (id: string) => {
    const { error } = await supabase.from("menu_interests").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Interesse removido");
    load();
  };

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Comercial</p>
        <h1 className="font-serif text-4xl mt-2">Interesses em upgrades</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-xl">Pipeline</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {list.length === 0 && (
            <p className="text-sm text-muted-foreground py-2">Nenhum interesse ainda.</p>
          )}
          {list.map((i) => (
            <div key={i.id} className="py-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">
                  {i.upgrades?.name}{" "}
                  <Badge variant="outline" className="text-xs ml-2 capitalize">
                    {i.upgrades?.category}
                  </Badge>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {i.clients?.full_name} • {i.clients?.email}
                  {i.clients?.whatsapp && ` • ${i.clients.whatsapp}`}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {i.events?.event_type} • {i.events?.event_date} • registrado{" "}
                  {format(new Date(i.created_at), "dd/MM/yyyy")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={i.status} onValueChange={(v) => updateStatus(i.id, v)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="novo">Novo</SelectItem>
                    <SelectItem value="em_contato">Em contato</SelectItem>
                    <SelectItem value="vendido">Vendido</SelectItem>
                    <SelectItem value="perdido">Perdido</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-rose"
                  onClick={() => removeUpgradeInterest(i.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-xl">Interesses em cardápios</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {menuList.length === 0 && (
            <p className="text-sm text-muted-foreground py-2">
              Nenhum interesse em cardápio ainda.
            </p>
          )}
          {menuList.map((i) => (
            <div key={i.id} className="py-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">
                  {i.menus?.name}{" "}
                  <Badge variant="outline" className="text-xs ml-2 capitalize">
                    {i.menus?.category}
                  </Badge>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {i.clients?.full_name} • {i.clients?.email}
                  {i.clients?.whatsapp && ` • ${i.clients.whatsapp}`}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {i.events?.event_type} • {i.events?.event_date} • registrado{" "}
                  {format(new Date(i.created_at), "dd/MM/yyyy")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={i.status} onValueChange={(v) => updateMenuStatus(i.id, v)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="novo">Novo</SelectItem>
                    <SelectItem value="em_contato">Em contato</SelectItem>
                    <SelectItem value="vendido">Vendido</SelectItem>
                    <SelectItem value="perdido">Perdido</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-rose"
                  onClick={() => removeMenuInterest(i.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
