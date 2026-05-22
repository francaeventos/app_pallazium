import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowLeft, ExternalLink, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/admin/checklist/$eventId")({
  component: Page,
});

type EventWithClient = Database["public"]["Tables"]["events"]["Row"] & {
  clients: { full_name: string } | null;
};
type ChecklistItem = Database["public"]["Tables"]["checklist_items"]["Row"];
type ChecklistStatus = Database["public"]["Enums"]["checklist_status"];
type PriorityLevel = Database["public"]["Enums"]["priority_level"];

function Page() {
  const { eventId } = Route.useParams();
  const [event, setEvent] = useState<EventWithClient | null>(null);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const [{ data: ev }, { data: its }] = await Promise.all([
      supabase.from("events").select("*, clients(full_name)").eq("id", eventId).single(),
      supabase.from("checklist_items").select("*").eq("event_id", eventId).order("sort_order"),
    ]);
    setEvent(ev);
    setItems(its ?? []);
  };
  useEffect(() => {
    load();
  }, [eventId]);

  const updateFromForm = async (id: string, e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase
      .from("checklist_items")
      .update({
        title: String(fd.get("title")),
        description: String(fd.get("description") || "") || null,
        status: String(fd.get("status")) as ChecklistStatus,
        priority: String(fd.get("priority")) as PriorityLevel,
        due_date: String(fd.get("due_date") || "") || null,
        attachment_url: String(fd.get("attachment_url") || "") || null,
        internal_notes: String(fd.get("internal_notes") || "") || null,
        sort_order: Number(fd.get("sort_order")) || 0,
      })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Item atualizado");
    load();
  };

  const add = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.from("checklist_items").insert({
      event_id: eventId,
      title: String(fd.get("title")),
      description: String(fd.get("description") || "") || null,
      priority: String(fd.get("priority")) as PriorityLevel,
      due_date: String(fd.get("due_date") || "") || null,
      attachment_url: String(fd.get("attachment_url") || "") || null,
      internal_notes: String(fd.get("internal_notes") || "") || null,
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
      <Link
        to="/admin/eventos"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3 mr-1" /> Eventos
      </Link>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl">{event?.clients?.full_name}</h1>
          <p className="text-sm text-muted-foreground capitalize">
            {event?.event_type} • {event?.event_date}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-3 w-3 mr-1" />
              Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">Novo item</DialogTitle>
            </DialogHeader>
            <form onSubmit={add} className="space-y-3">
              <div>
                <Label>Título</Label>
                <Input name="title" required />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea name="description" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Prazo</Label>
                  <Input name="due_date" type="date" />
                </div>
                <div>
                  <Label>Anexo (URL)</Label>
                  <Input name="attachment_url" type="url" />
                </div>
              </div>
              <div>
                <Label>Prioridade</Label>
                <Select name="priority" defaultValue="media">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notas internas</Label>
                <Textarea name="internal_notes" />
              </div>
              <Button type="submit" className="w-full">
                Adicionar
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {items.map((it) => (
          <Card key={it.id}>
            <CardContent className="p-4">
              <form onSubmit={(e) => updateFromForm(it.id, e)} className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">#{it.sort_order + 1}</Badge>
                    {it.attachment_url && (
                      <Button asChild variant="ghost" size="sm">
                        <a href={it.attachment_url} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Anexo
                        </a>
                      </Button>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" type="button" onClick={() => remove(it.id)}>
                    <Trash2 className="h-4 w-4 text-rose" />
                  </Button>
                </div>
                <div className="grid lg:grid-cols-[1fr_170px_140px] gap-3">
                  <div>
                    <Label>Título</Label>
                    <Input name="title" defaultValue={it.title} required />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select name="status" defaultValue={it.status}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="em_analise">Em análise</SelectItem>
                        <SelectItem value="concluido">Concluído</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Prioridade</Label>
                    <Select name="priority" defaultValue={it.priority}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="media">Média</SelectItem>
                        <SelectItem value="baixa">Baixa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea name="description" defaultValue={it.description ?? ""} />
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <Label>Prazo</Label>
                    <Input name="due_date" type="date" defaultValue={it.due_date ?? ""} />
                  </div>
                  <div>
                    <Label>Ordem</Label>
                    <Input name="sort_order" type="number" defaultValue={it.sort_order} />
                  </div>
                  <div>
                    <Label>Anexo (URL)</Label>
                    <Input
                      name="attachment_url"
                      type="url"
                      defaultValue={it.attachment_url ?? ""}
                    />
                  </div>
                </div>
                <div>
                  <Label>Notas internas</Label>
                  <Textarea name="internal_notes" defaultValue={it.internal_notes ?? ""} />
                </div>
                <div className="flex justify-end">
                  <Button size="sm" type="submit">
                    <Save className="h-3 w-3 mr-1" />
                    Salvar item
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
