import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, ListChecks } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/eventos")({ component: Page });

const DEFAULT_CHECKLIST = [
  "Contrato fechado", "Data confirmada", "Local confirmado", "Quantidade de convidados",
  "Horário de início", "Horário de encerramento", "Cardápio escolhido", "Bebidas definidas",
  "Decoração definida", "Mesa principal definida", "Bolo escolhido", "Doces definidos",
  "Música ou DJ definido", "Som e iluminação definidos", "Fotógrafo definido", "Filmagem definida",
  "Cerimonial ou assessoria", "Recepção", "Segurança", "Lembrancinhas", "Cronograma do evento", "Observações especiais",
];

function Page() {
  const [events, setEvents] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const [{ data: evs }, { data: cls }] = await Promise.all([
      supabase.from("events").select("*, clients(full_name, email)").order("event_date", { ascending: true }),
      supabase.from("clients").select("id, full_name"),
    ]);
    setEvents(evs ?? []);
    setClients(cls ?? []);
  };
  useEffect(() => { load(); }, []);

  const create = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const clientId = String(fd.get("client_id"));
    const { data, error } = await supabase.from("events").insert({
      client_id: clientId,
      event_type: String(fd.get("event_type")),
      event_date: String(fd.get("event_date") || "") || null,
      location: String(fd.get("location") || "") || null,
      estimated_guests: Number(fd.get("estimated_guests")) || null,
      client_notes: String(fd.get("client_notes") || "") || null,
    }).select().single();
    if (error || !data) return toast.error(error?.message ?? "Erro");

    const items = DEFAULT_CHECKLIST.map((title, i) => ({
      event_id: data.id, title, sort_order: i,
      priority: i < 6 ? "alta" : i < 16 ? "media" : "baixa" as any,
    }));
    await supabase.from("checklist_items").insert(items);

    toast.success("Evento criado com checklist padrão");
    setOpen(false);
    load();
  };

  return (
    <div className="p-6 lg:p-10 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-serif text-4xl">Eventos</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Novo evento</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-serif text-2xl">Novo evento</DialogTitle></DialogHeader>
            <form onSubmit={create} className="space-y-4">
              <div>
                <Label>Cliente</Label>
                <Select name="client_id" required>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Tipo de evento</Label><Input name="event_type" required placeholder="Casamento, Debutante, ..." /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Data</Label><Input name="event_date" type="date" /></div>
                <div><Label>Convidados</Label><Input name="estimated_guests" type="number" /></div>
              </div>
              <div><Label>Local</Label><Input name="location" /></div>
              <div><Label>Observações para o cliente</Label><Textarea name="client_notes" maxLength={1000} /></div>
              <Button type="submit" className="w-full">Criar evento</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="font-serif text-xl">Todos os eventos</CardTitle></CardHeader>
        <CardContent className="divide-y">
          {events.length === 0 && <p className="text-sm text-muted-foreground py-2">Nenhum evento.</p>}
          {events.map((e) => (
            <div key={e.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{e.clients?.full_name ?? "—"}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {e.event_type} • {e.event_date ?? "sem data"} • {e.estimated_guests ?? "?"} convidados
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">{e.status.replace("_", " ")}</span>
                <Link to="/admin/checklist/$eventId" params={{ eventId: e.id }}>
                  <Button variant="outline" size="sm"><ListChecks className="h-3 w-3 mr-1" />Checklist</Button>
                </Link>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
