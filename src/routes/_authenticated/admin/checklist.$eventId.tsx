import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  addChecklistItemFn,
  applyBrideChecklistFn,
  deleteChecklistItemFn,
  getEventChecklistFn,
  updateChecklistItemFn,
} from "@/fns/checklist";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AdminEmptyState } from "@/components/AdminEmptyState";
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
import { ArrowLeft, ExternalLink, ListChecks, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/checklist/$eventId")({
  component: Page,
});

type EventWithClient = {
  id: string;
  event_type: string;
  event_date: string | null;
  clients: { full_name: string } | null;
};

type ChecklistItem = {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  status: ChecklistStatus;
  priority: PriorityLevel;
  due_date: string | null;
  client_notes: string | null;
  internal_notes: string | null;
  attachment_url: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type ChecklistStatus = "pendente" | "em_analise" | "concluido";
type PriorityLevel = "baixa" | "media" | "alta";

type ChecklistItemPatch = {
  title?: string;
  description?: string | null;
  status?: ChecklistStatus;
  priority?: PriorityLevel;
  due_date?: string | null;
  attachment_url?: string | null;
  client_notes?: string | null;
  internal_notes?: string | null;
  sort_order?: number;
};

function Page() {
  const { eventId } = Route.useParams();
  const [event, setEvent] = useState<EventWithClient | null>(null);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [open, setOpen] = useState(false);
  const [newPriority, setNewPriority] = useState<PriorityLevel>("media");

  const load = async () => {
    try {
      const data = await getEventChecklistFn({ data: { event_id: eventId } });
      setEvent({
        id: data.event.id,
        event_type: data.event.event_type,
        event_date: data.event.event_date,
        clients: data.event.clients
          ? { full_name: data.event.clients.full_name }
          : null,
      });
      setItems(data.items as ChecklistItem[]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar checklist.");
    }
  };
  useEffect(() => {
    load();
  }, [eventId]);

  const updateItem = async (id: string, patch: ChecklistItemPatch) => {
    try {
      await updateChecklistItemFn({ data: { id, ...patch } });
      toast.success("Item atualizado");
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar item.");
    }
  };

  const add = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await addChecklistItemFn({
        data: {
          event_id: eventId,
          title: String(fd.get("title")),
          description: String(fd.get("description") || "") || null,
          priority: newPriority,
          due_date: String(fd.get("due_date") || "") || null,
          attachment_url: String(fd.get("attachment_url") || "") || null,
          client_notes: String(fd.get("client_notes") || "") || null,
          internal_notes: String(fd.get("internal_notes") || "") || null,
          sort_order: items.length,
        },
      });
      toast.success("Item adicionado");
      setOpen(false);
      setNewPriority("media");
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao adicionar item.");
    }
  };

  const applyBrideChecklist = async () => {
    try {
      const result = await applyBrideChecklistFn({ data: { event_id: eventId } });
      if (result.applied === 0) {
        return toast.info(result.message ?? "Checklist da noiva já aplicado neste evento.");
      }
      toast.success("Checklist da noiva aplicado");
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao aplicar checklist.");
    }
  };

  const remove = async (id: string) => {
    const confirmed = window.confirm("Excluir este item do checklist?");
    if (!confirmed) return;
    try {
      await deleteChecklistItemFn({ data: { id } });
      toast.success("Item removido");
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao remover item.");
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-6">
      <Link
        to="/admin/eventos"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3 mr-1" /> Eventos
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl">{event?.clients?.full_name}</h1>
          <p className="text-sm text-muted-foreground capitalize">
            {event?.event_type} • {event?.event_date}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={applyBrideChecklist}>
            <Sparkles className="h-3 w-3 mr-1" />
            Checklist da noiva
          </Button>
          <Dialog
            open={open}
            onOpenChange={(value) => {
              setOpen(value);
              if (!value) setNewPriority("media");
            }}
          >
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
                  <Select
                    value={newPriority}
                    onValueChange={(value) => setNewPriority(value as PriorityLevel)}
                  >
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
                  <Label>Observações da cliente</Label>
                  <Textarea name="client_notes" />
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
      </div>

      <div className="space-y-2">
        {items.length === 0 && (
          <AdminEmptyState
            icon={ListChecks}
            title="Adicione o primeiro item"
            description="Este evento ainda não tem checklist. Crie tarefas para acompanhar decisões, prazos, anexos e notas internas."
            actionLabel="Novo item"
            onAction={() => setOpen(true)}
          />
        )}
        {items.map((it) => (
          <ChecklistItemCard key={it.id} item={it} onSave={updateItem} onRemove={remove} />
        ))}
      </div>
    </div>
  );
}

function ChecklistItemCard({
  item,
  onSave,
  onRemove,
}: {
  item: ChecklistItem;
  onSave: (id: string, patch: ChecklistItemPatch) => Promise<void>;
  onRemove: (id: string) => void;
}) {
  const [status, setStatus] = useState<ChecklistStatus>(item.status);
  const [priority, setPriority] = useState<PriorityLevel>(item.priority);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    onSave(item.id, {
      title: String(fd.get("title")),
      description: String(fd.get("description") || "") || null,
      status,
      priority,
      due_date: String(fd.get("due_date") || "") || null,
      attachment_url: String(fd.get("attachment_url") || "") || null,
      client_notes: String(fd.get("client_notes") || "") || null,
      internal_notes: String(fd.get("internal_notes") || "") || null,
      sort_order: Number(fd.get("sort_order")) || 0,
    });
  };

  return (
    <Card>
      <CardContent className="p-4">
        <form onSubmit={submit} className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline">#{item.sort_order + 1}</Badge>
              {item.attachment_url && (
                <Button asChild variant="ghost" size="sm">
                  <a href={item.attachment_url} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Anexo
                  </a>
                </Button>
              )}
            </div>
            <Button variant="ghost" size="icon" type="button" onClick={() => onRemove(item.id)}>
              <Trash2 className="h-4 w-4 text-rose" />
            </Button>
          </div>
          <div className="grid lg:grid-cols-[1fr_170px_140px] gap-3">
            <div>
              <Label>Título</Label>
              <Input name="title" defaultValue={item.title} required />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as ChecklistStatus)}>
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
              <Select
                value={priority}
                onValueChange={(value) => setPriority(value as PriorityLevel)}
              >
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
            <Textarea name="description" defaultValue={item.description ?? ""} />
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Label>Prazo</Label>
              <Input name="due_date" type="date" defaultValue={item.due_date ?? ""} />
            </div>
            <div>
              <Label>Ordem</Label>
              <Input name="sort_order" type="number" defaultValue={item.sort_order} />
            </div>
            <div>
              <Label>Anexo (URL)</Label>
              <Input name="attachment_url" type="url" defaultValue={item.attachment_url ?? ""} />
            </div>
          </div>
          <div>
            <Label>Observações da cliente</Label>
            <Textarea name="client_notes" defaultValue={item.client_notes ?? ""} />
          </div>
          <div>
            <Label>Notas internas</Label>
            <Textarea name="internal_notes" defaultValue={item.internal_notes ?? ""} />
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
  );
}
