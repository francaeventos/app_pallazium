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
import { Textarea } from "@/components/ui/textarea";
import { AdminEmptyState } from "@/components/AdminEmptyState";
import { StorageImageInput } from "@/components/StorageImageInput";
import { Eye, EyeOff, Lightbulb, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/admin/dicas")({ component: Page });

type Tip = Database["public"]["Tables"]["tips"]["Row"];

function Page() {
  const [items, setItems] = useState<Tip[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tip | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("tips")
      .select("*")
      .order("created_at", { ascending: false });
    setItems(data ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      title: String(fd.get("title")),
      category: String(fd.get("category")),
      content: String(fd.get("content")),
      image_url: String(fd.get("image_url") || "") || null,
      active: fd.get("active") === "on",
    };
    const { error } = editing
      ? await supabase.from("tips").update(payload).eq("id", editing.id)
      : await supabase.from("tips").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Dica atualizada" : "Dica criada");
    setOpen(false);
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("tips").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Dica excluída");
    load();
  };

  const toggleActive = async (item: Tip) => {
    const { error } = await supabase
      .from("tips")
      .update({ active: !item.active })
      .eq("id", item.id);
    if (error) return toast.error(error.message);
    toast.success(item.active ? "Dica ocultada" : "Dica publicada");
    load();
  };

  const openCreate = () => {
    setEditing(null);
    setOpen(true);
  };

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Conteúdo</p>
          <h1 className="font-serif text-4xl mt-2">Dicas</h1>
        </div>
        <Dialog
          open={open}
          onOpenChange={(value) => {
            setOpen(value);
            if (!value) setEditing(null);
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
                {editing ? "Editar dica" : "Nova dica"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={save} className="space-y-3">
              <div>
                <Label>Título</Label>
                <Input name="title" required defaultValue={editing?.title ?? ""} />
              </div>
              <div>
                <Label>Categoria</Label>
                <Input name="category" required defaultValue={editing?.category ?? ""} />
              </div>
              <div>
                <Label>Conteúdo</Label>
                <Textarea name="content" required rows={6} defaultValue={editing?.content ?? ""} />
              </div>
              <div>
                <StorageImageInput
                  bucket="catalogos"
                  name="image_url"
                  label="Imagem"
                  defaultValue={editing?.image_url ?? ""}
                  folder="dicas"
                  publicBucket={false}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input name="active" type="checkbox" defaultChecked={editing?.active ?? true} />
                Visível para clientes
              </label>
              <Button type="submit" className="w-full">
                Salvar
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {items.length === 0 && (
        <AdminEmptyState
          icon={Lightbulb}
          title="Crie a primeira dica"
          description="Use este espaço para orientar os clientes com prazos, decisões importantes e recomendações para o evento."
          actionLabel="Nova dica"
          onAction={openCreate}
        />
      )}
      <div className="grid lg:grid-cols-2 gap-4">
        {items.map((item) => (
          <Card key={item.id} className={!item.active ? "opacity-70" : undefined}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-serif text-xl">{item.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">{item.category}</p>
                </div>
                <Badge variant={item.active ? "default" : "outline"}>
                  {item.active ? "Ativa" : "Oculta"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-3">{item.content}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditing(item);
                    setOpen(true);
                  }}
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  Editar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => toggleActive(item)}>
                  {item.active ? (
                    <>
                      <EyeOff className="h-3 w-3 mr-1" />
                      Ocultar
                    </>
                  ) : (
                    <>
                      <Eye className="h-3 w-3 mr-1" />
                      Publicar
                    </>
                  )}
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
