import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMyEvent } from "@/hooks/use-my-event";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ClientEmptyState } from "@/components/ClientEmptyState";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ExternalLink, Images, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/app/referencias")({ component: Page });

type Reference = Database["public"]["Tables"]["event_references"]["Row"];

function Page() {
  const { data, loading: eventLoading } = useMyEvent();
  const [items, setItems] = useState<Reference[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Reference | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!data?.event) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: refs } = await supabase
      .from("event_references")
      .select("*")
      .eq("event_id", data.event.id)
      .order("created_at", { ascending: false });
    setItems(refs ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [data?.event?.id]);

  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!data?.event) return toast.error("Evento não vinculado.");
    const fd = new FormData(e.currentTarget);
    const payload = {
      event_id: data.event.id,
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
    toast.success(editing ? "Referência atualizada." : "Referência salva.");
    setOpen(false);
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("event_references").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Referência removida.");
    load();
  };

  if (eventLoading || loading) return <div className="p-8 text-muted-foreground">Carregando…</div>;

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Inspirações</p>
          <h1 className="font-serif text-4xl mt-2">Referências do evento</h1>
          <p className="text-muted-foreground mt-2">
            Salve links, imagens e ideias para a equipe entender seu estilo.
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(value) => {
            setOpen(value);
            if (!value) setEditing(null);
          }}
        >
          <DialogTrigger asChild>
            <Button disabled={!data?.event}>
              <Plus className="h-4 w-4 mr-1" />
              Nova referência
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
                <Label>Título</Label>
                <Input name="title" required defaultValue={editing?.title ?? ""} />
              </div>
              <div>
                <Label>Categoria</Label>
                <Input
                  name="category"
                  required
                  defaultValue={editing?.category ?? ""}
                  placeholder="Decoração, mesa, flores..."
                />
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
                <Textarea name="notes" defaultValue={editing?.notes ?? ""} rows={4} />
              </div>
              <Button type="submit" className="w-full">
                Salvar
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {!data?.event && (
        <ClientEmptyState
          icon={Images}
          title="Evento em configuração"
          description="Assim que a equipe vincular seu evento à sua conta, você poderá salvar referências, links e ideias para orientar a curadoria Pallazium."
        />
      )}

      {data?.event && items.length === 0 && (
        <ClientEmptyState
          icon={Images}
          title="Comece sua pasta de inspirações"
          description="Use o botão “Nova referência” para guardar imagens, links e observações que ajudem a equipe a entender o estilo desejado para o evento."
        />
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <Card key={item.id} className="overflow-hidden">
            {item.image_url ? (
              <div
                className="h-44 bg-muted bg-cover bg-center"
                style={{ backgroundImage: `url(${item.image_url})` }}
              />
            ) : (
              <div className="h-44 bg-muted flex items-center justify-center">
                <Images className="h-8 w-8 text-gold" />
              </div>
            )}
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-serif text-xl">{item.title}</h2>
                <Badge variant="outline" className="text-xs capitalize">
                  {item.category}
                </Badge>
              </div>
              {item.notes && <p className="text-sm text-muted-foreground">{item.notes}</p>}
              <div className="flex flex-wrap gap-2">
                {item.inspiration_link && (
                  <Button asChild variant="outline" size="sm">
                    <a href={item.inspiration_link} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Abrir link
                    </a>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditing(item);
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
                  Remover
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
