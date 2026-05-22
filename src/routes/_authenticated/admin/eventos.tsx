import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Ban, CheckCircle2, ListChecks, Pencil, Plus, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/admin/eventos")({ component: Page });

type Client = Pick<Database["public"]["Tables"]["clients"]["Row"], "id" | "full_name">;
type EventRow = Database["public"]["Tables"]["events"]["Row"];
type EventStatus = Database["public"]["Enums"]["event_status"];
type PriorityLevel = Database["public"]["Enums"]["priority_level"];
type EventWithClient = EventRow & {
  clients: { full_name: string; email: string } | null;
};

const DEFAULT_CHECKLIST = [
  "Contrato fechado",
  "Data confirmada",
  "Local confirmado",
  "Quantidade de convidados",
  "Horário de início",
  "Horário de encerramento",
  "Cardápio escolhido",
  "Bebidas definidas",
  "Decoração definida",
  "Mesa principal definida",
  "Bolo escolhido",
  "Doces definidos",
  "Música ou DJ definido",
  "Som e iluminação definidos",
  "Fotógrafo definido",
  "Filmagem definida",
  "Cerimonial ou assessoria",
  "Recepção",
  "Segurança",
  "Lembrancinhas",
  "Cronograma do evento",
  "Observações especiais",
];

function Page() {
  const [events, setEvents] = useState<EventWithClient[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EventWithClient | null>(null);
  const [createClientId, setCreateClientId] = useState("");
  const [createStatus, setCreateStatus] = useState<EventStatus>("novo");
  const [editClientId, setEditClientId] = useState("");
  const [editStatus, setEditStatus] = useState<EventStatus>("novo");

  const load = async () => {
    const [{ data: evs }, { data: cls }] = await Promise.all([
      supabase
        .from("events")
        .select("*, clients(full_name, email)")
        .order("event_date", { ascending: true }),
      supabase.from("clients").select("id, full_name"),
    ]);
    setEvents(evs ?? []);
    setClients(cls ?? []);
  };
  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!editing) return;
    setEditClientId(editing.client_id);
    setEditStatus(editing.status);
  }, [editing]);

  const create = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!createClientId) return toast.error("Selecione um cliente.");
    const { data, error } = await supabase
      .from("events")
      .insert({
        client_id: createClientId,
        event_type: String(fd.get("event_type")),
        event_date: String(fd.get("event_date") || "") || null,
        start_time: String(fd.get("start_time") || "") || null,
        end_time: String(fd.get("end_time") || "") || null,
        location: String(fd.get("location") || "") || null,
        estimated_guests: Number(fd.get("estimated_guests")) || null,
        contracted_value: Number(fd.get("contracted_value")) || null,
        financial_status: String(fd.get("financial_status") || "") || null,
        status: createStatus,
        client_notes: String(fd.get("client_notes") || "") || null,
        internal_notes: String(fd.get("internal_notes") || "") || null,
      })
      .select()
      .single();
    if (error || !data) return toast.error(error?.message ?? "Erro");

    const items = DEFAULT_CHECKLIST.map((title, i) => ({
      event_id: data.id,
      title,
      sort_order: i,
      priority: (i < 6 ? "alta" : i < 16 ? "media" : "baixa") as PriorityLevel,
    }));
    await supabase.from("checklist_items").insert(items);

    toast.success("Evento criado com checklist padrão");
    setOpen(false);
    setCreateClientId("");
    setCreateStatus("novo");
    load();
  };

  const update = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editing) return;
    const fd = new FormData(e.currentTarget);
    if (!editClientId) return toast.error("Selecione um cliente.");
    const { error } = await supabase
      .from("events")
      .update({
        client_id: editClientId,
        event_type: String(fd.get("event_type")),
        event_date: String(fd.get("event_date") || "") || null,
        start_time: String(fd.get("start_time") || "") || null,
        end_time: String(fd.get("end_time") || "") || null,
        location: String(fd.get("location") || "") || null,
        estimated_guests: Number(fd.get("estimated_guests")) || null,
        contracted_value: Number(fd.get("contracted_value")) || null,
        financial_status: String(fd.get("financial_status") || "") || null,
        status: editStatus,
        client_notes: String(fd.get("client_notes") || "") || null,
        internal_notes: String(fd.get("internal_notes") || "") || null,
      })
      .eq("id", editing.id);
    if (error) return toast.error(error.message);
    toast.success("Evento atualizado");
    setEditing(null);
    load();
  };

  const updateEventStatus = async (eventId: string, status: EventStatus) => {
    const { error } = await supabase.from("events").update({ status }).eq("id", eventId);
    if (error) return toast.error(error.message);
    toast.success("Status do evento atualizado");
    load();
  };

  return (
    <div className="p-6 lg:p-10 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-serif text-4xl">Eventos</h1>
        <Dialog
          open={open}
          onOpenChange={(value) => {
            setOpen(value);
            if (!value) {
              setCreateClientId("");
              setCreateStatus("novo");
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              Novo evento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">Novo evento</DialogTitle>
            </DialogHeader>
            <form onSubmit={create} className="space-y-4">
              <div>
                <Label>Cliente</Label>
                <Select value={createClientId} onValueChange={setCreateClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo de evento</Label>
                <Input name="event_type" required placeholder="Casamento, Debutante, ..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Data</Label>
                  <Input name="event_date" type="date" />
                </div>
                <div>
                  <Label>Convidados</Label>
                  <Input name="estimated_guests" type="number" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Início</Label>
                  <Input name="start_time" type="time" />
                </div>
                <div>
                  <Label>Encerramento</Label>
                  <Input name="end_time" type="time" />
                </div>
              </div>
              <div>
                <Label>Local</Label>
                <Input name="location" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Valor contratado</Label>
                  <Input name="contracted_value" type="number" step="0.01" min="0" />
                </div>
                <div>
                  <Label>Status financeiro</Label>
                  <Input name="financial_status" placeholder="Em aberto, pago..." />
                </div>
              </div>
              <div>
                <Label>Status do evento</Label>
                <Select
                  value={createStatus}
                  onValueChange={(value) => setCreateStatus(value as EventStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="novo">Novo</SelectItem>
                    <SelectItem value="em_organizacao">Em organização</SelectItem>
                    <SelectItem value="proximo">Próximo da data</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Observações para o cliente</Label>
                <Textarea name="client_notes" maxLength={1000} />
              </div>
              <div>
                <Label>Observações internas</Label>
                <Textarea name="internal_notes" maxLength={1000} />
              </div>
              <Button type="submit" className="w-full">
                Criar evento
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-xl">Todos os eventos</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {events.length === 0 && (
            <p className="text-sm text-muted-foreground py-2">Nenhum evento.</p>
          )}
          {events.map((e) => (
            <div key={e.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{e.clients?.full_name ?? "—"}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {e.event_type} • {e.event_date ?? "sem data"} • {e.estimated_guests ?? "?"}{" "}
                  convidados
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  {e.status.replace("_", " ")}
                </span>
                <Button variant="ghost" size="sm" onClick={() => setEditing(e)}>
                  <Pencil className="h-3 w-3 mr-1" />
                  Editar
                </Button>
                {e.status !== "concluido" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => updateEventStatus(e.id, "concluido")}
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Concluir
                  </Button>
                )}
                {e.status !== "cancelado" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-rose"
                    onClick={() => updateEventStatus(e.id, "cancelado")}
                  >
                    <Ban className="h-3 w-3 mr-1" />
                    Cancelar
                  </Button>
                )}
                {(e.status === "cancelado" || e.status === "concluido") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => updateEventStatus(e.id, "em_organizacao")}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reabrir
                  </Button>
                )}
                <Link to="/admin/checklist/$eventId" params={{ eventId: e.id }}>
                  <Button variant="outline" size="sm">
                    <ListChecks className="h-3 w-3 mr-1" />
                    Checklist
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(value) => !value && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Editar evento</DialogTitle>
          </DialogHeader>
          {editing && (
            <form onSubmit={update} className="space-y-4">
              <div>
                <Label>Cliente</Label>
                <Select value={editClientId} onValueChange={setEditClientId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo de evento</Label>
                <Input name="event_type" required defaultValue={editing.event_type} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Data</Label>
                  <Input name="event_date" type="date" defaultValue={editing.event_date ?? ""} />
                </div>
                <div>
                  <Label>Convidados</Label>
                  <Input
                    name="estimated_guests"
                    type="number"
                    defaultValue={editing.estimated_guests ?? ""}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Início</Label>
                  <Input name="start_time" type="time" defaultValue={editing.start_time ?? ""} />
                </div>
                <div>
                  <Label>Encerramento</Label>
                  <Input name="end_time" type="time" defaultValue={editing.end_time ?? ""} />
                </div>
              </div>
              <div>
                <Label>Local</Label>
                <Input name="location" defaultValue={editing.location ?? ""} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Valor contratado</Label>
                  <Input
                    name="contracted_value"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={editing.contracted_value ?? ""}
                  />
                </div>
                <div>
                  <Label>Status financeiro</Label>
                  <Input name="financial_status" defaultValue={editing.financial_status ?? ""} />
                </div>
              </div>
              <div>
                <Label>Status do evento</Label>
                <Select
                  value={editStatus}
                  onValueChange={(value) => setEditStatus(value as EventStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="novo">Novo</SelectItem>
                    <SelectItem value="em_organizacao">Em organização</SelectItem>
                    <SelectItem value="proximo">Próximo da data</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Observações para o cliente</Label>
                <Textarea
                  name="client_notes"
                  maxLength={1000}
                  defaultValue={editing.client_notes ?? ""}
                />
              </div>
              <div>
                <Label>Observações internas</Label>
                <Textarea
                  name="internal_notes"
                  maxLength={1000}
                  defaultValue={editing.internal_notes ?? ""}
                />
              </div>
              <Button type="submit" className="w-full">
                Salvar alterações
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
