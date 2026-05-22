import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/checklist/$eventId")({ component: Page });

function Page() {
  const { eventId } = Route.useParams();
  const [event, setEvent] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const [{ data: ev }, { data: its }] = await Promise.all([
      supabase.from("events").select("*, clients(full_name)").eq("id", eventId).single(),
      supabase.from("checklist_items").select("*").eq("event_id", eventId).order("sort_order"),
    ]);
    setEvent(ev);
    setItems(its ?? []);
  };
  useEffect(() => { load(); }, [eventId]);

  const update = async (id: string, patch: any) => {
    const { error } = await supabase.from("checklist_items").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else load();
  };

  const add = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.from("checklist_items").insert({
      event_id: eventId,
      title: String(fd.get("title")),
      description: String(fd.get("description") || "") || null,
      priority: String(fd.get("priority")) as any,
      sort_order: items.length,
    });
    if (error) return toast.error(error.message);
    toast.success("Item adicionado");
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("checklist_items").delete().eq("id", id);
    load();
  };

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-6">
      <Link to="/admin/eventos" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3 mr-1" /> Eventos
      </Link>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl">{event?.clients?.full_name}</h1>
          <p className="text-sm text-muted-foreground capitalize">{event?.event_type} • {event?.event_date}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-3 w-3 mr-1" />Item</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-serif text-2xl">Novo item</DialogTitle></DialogHeader>
            <form onSubmit={add} className="space-y-3">
              <div><Label>Título</Label><Input name="title" required /></div>
              <div><Label>Descrição</Label><Textarea name="description" /></div>
              <div>
                <Label>Prioridade</Label>
                <Select name="priority" defaultValue="media">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">Adicionar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {items.map((it) => (
          <Card key={it.id}>
            <CardContent className="p-4 flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <p className="font-medium">{it.title}</p>
                {it.description && <p className="text-xs text-muted-foreground">{it.description}</p>}
              </div>
              <Select value={it.status} onValueChange={(v) => update(it.id, { status: v })}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="em_analise">Em análise</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                </SelectContent>
              </Select>
              <Select value={it.priority} onValueChange={(v) => update(it.id, { priority: v })}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" onClick={() => remove(it.id)}><Trash2 className="h-4 w-4 text-rose" /></Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
