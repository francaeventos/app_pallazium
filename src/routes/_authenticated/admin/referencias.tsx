import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/admin/referencias")({ component: Page });

type Reference = Database["public"]["Tables"]["event_references"]["Row"] & {
  events?: {
    event_type: string;
    event_date: string | null;
    clients?: { full_name: string } | null;
  } | null;
};
type EventOption = {
  id: string;
  event_type: string;
  event_date: string | null;
  clients: { full_name: string } | null;
};

function Page() {
  const [items, setItems] = useState<Reference[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Reference | null>(null);
  const [selectedEventId, setSelectedEventId] = useState("");

  const load = async () => {
    const [{ data: refs }, { data: eventRows }] = await Promise.all([
      supabase
        .from("event_references")
        .select("*, events(event_type, event_date, clients(full_name))")
        .order("created_at", { ascending: false }),
      supabase
        .from("events")
        .select("id, event_type, event_date, clients(full_name)")
        .order("event_date"),
    ]);
    setItems((refs ?? []) as Reference[]);
    setEvents((eventRows ?? []) as EventOption[]);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!editing) return;
    setSelectedEventId(editing.event_id);
  }, [editing]);

  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!selectedEventId) return toast.error("Selecione um evento.");
    const payload = {
      event_id: selectedEventId,
      title: String(fd.get("title")),
      category: String(fd.get("category")),
      image_url: String(fd.get("image_url") || "") || null,
      inspiration_link: String(fd.get("inspiration_link") || "") || null,
      notes: String(fd.get("notes") || "") || null,
    };
    const { error } = editing
      ? await supabase.from("event_references").update(payload).eq("id", editing.id)
      : await supabase.from("event_references").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Referência atualizada" : "Referência criada");
    setOpen(false);
    setEditing(null);
    setSelectedEventId("");
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("event_references").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Referência removida");
    load();
  };

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Eventos</p>
          <h1 className="font-serif text-4xl mt-2">Referências</h1>
        </div>
        <Dialog
          open={open}
          onOpenChange={(value) => {
            setOpen(value);
            if (!value) {
              setEditing(null);
              setSelectedEventId("");
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              Nova
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">
                {editing ? "Editar referência" : "Nova referência"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={save} className="space-y-3">
              <div>
                <Label>Evento</Label>
                <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.clients?.full_name ?? "Cliente"} • {event.event_type} •{" "}
                        {event.event_date ?? "sem data"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Título</Label>
                <Input name="title" required defaultValue={editing?.title ?? ""} />
              </div>
              <div>
                <Label>Categoria</Label>
                <Input name="category" required defaultValue={editing?.category ?? ""} />
              </div>
              <div>
                <Label>Imagem (URL)</Label>
                <Input name="image_url" type="url" defaultValue={editing?.image_url ?? ""} />
              </div>
              <div>
                <Label>Link da inspiração</Label>
                <Input
                  name="inspiration_link"
                  type="url"
                  defaultValue={editing?.inspiration_link ?? ""}
                />
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea name="notes" defaultValue={editing?.notes ?? ""} />
              </div>
              <Button type="submit" className="w-full">
                Salvar
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <Card key={item.id}>
            {item.image_url && (
              <div
                className="h-36 bg-muted bg-cover bg-center"
                style={{ backgroundImage: `url(${item.image_url})` }}
              />
            )}
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-serif text-xl">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.events?.clients?.full_name ?? "Cliente"} •{" "}
                    {item.events?.event_type ?? "Evento"}
                  </p>
                </div>
                <Badge variant="outline">{item.category}</Badge>
              </div>
              {item.notes && <p className="text-sm">{item.notes}</p>}
              <div className="flex flex-wrap gap-2">
                {item.inspiration_link && (
                  <Button asChild variant="ghost" size="sm">
                    <a href={item.inspiration_link} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Abrir
                    </a>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditing(item);
                    setSelectedEventId(item.event_id);
                    setOpen(true);
                  }}
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-rose"
                  onClick={() => remove(item.id)}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Excluir
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
