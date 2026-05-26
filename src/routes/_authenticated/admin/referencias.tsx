import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { deleteReferenceFn, listReferencesFn, saveReferenceFn } from "@/fns/admin-references";
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
import { AdminEmptyState } from "@/components/AdminEmptyState";
import { StorageImageInput } from "@/components/StorageImageInput";
import { ExternalLink, GalleryHorizontalEnd, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
export const Route = createFileRoute("/_authenticated/admin/referencias")({ component: Page });

type Reference = Awaited<ReturnType<typeof listReferencesFn>>["references"][number];
type EventOption = Awaited<ReturnType<typeof listReferencesFn>>["events"][number];

function Page() {
  const [items, setItems] = useState<Reference[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Reference | null>(null);
  const [selectedEventId, setSelectedEventId] = useState("");

  const load = async () => {
    try {
      const { references, events } = await listReferencesFn();
      setItems(references);
      setEvents(events);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível carregar as referências.");
    }
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
    try {
      await saveReferenceFn({
        data: {
          id: editing?.id,
          ...payload,
        },
      });
    } catch (error) {
      return toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    }
    toast.success(editing ? "Referência atualizada" : "Referência criada");
    setOpen(false);
    setEditing(null);
    setSelectedEventId("");
    load();
  };

  const remove = async (id: string) => {
    try {
      await deleteReferenceFn({ data: { id } });
    } catch (error) {
      return toast.error(error instanceof Error ? error.message : "Não foi possível excluir.");
    }
    toast.success("Referência removida");
    load();
  };

  const openCreate = () => {
    if (events.length === 0) {
      return toast.error("Cadastre um evento antes de criar referências.");
    }
    setEditing(null);
    setSelectedEventId("");
    setOpen(true);
  };

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Biblioteca compartilhada
          </p>
          <h1 className="font-serif text-4xl mt-2">Referências</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Cadastre referências vinculadas a um evento modelo. Clientes verão tudo agrupado por
            tipo/nível do evento.
          </p>
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
            <Button onClick={openCreate}>
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
                <StorageImageInput
                  bucket="catalogos"
                  name="image_url"
                  label="Imagem"
                  defaultValue={editing?.image_url ?? ""}
                  folder="referencias"
                />
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
      {items.length === 0 && (
        <AdminEmptyState
          icon={GalleryHorizontalEnd}
          title="Adicione a primeira referência"
          description="Vincule inspirações a eventos modelo para alimentar a biblioteca de referências dos clientes."
          actionLabel="Nova referência"
          onAction={openCreate}
        />
      )}
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
