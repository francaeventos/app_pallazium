import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ChefHat, Eye, EyeOff, ImageIcon, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/admin/cardapios")({ component: Page });

type Menu = Database["public"]["Tables"]["menus"]["Row"];

function Page() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Menu | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("menus")
      .select("*")
      .order("created_at", { ascending: false });
    setMenus(data ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name")),
      category: String(fd.get("category")),
      description: String(fd.get("description") || "") || null,
      items: String(fd.get("items") || "") || null,
      image_url: String(fd.get("image_url") || "") || null,
      notes: String(fd.get("notes") || "") || null,
      active: fd.get("active") === "on",
    };
    const { error } = editing
      ? await supabase.from("menus").update(payload).eq("id", editing.id)
      : await supabase.from("menus").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Cardápio atualizado" : "Cardápio criado");
    setOpen(false);
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("menus").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Cardápio excluído");
    load();
  };

  const toggleActive = async (menu: Menu) => {
    const { error } = await supabase
      .from("menus")
      .update({ active: !menu.active })
      .eq("id", menu.id);
    if (error) return toast.error(error.message);
    toast.success(menu.active ? "Cardápio ocultado" : "Cardápio publicado");
    load();
  };

  const openCreate = () => {
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (menu: Menu) => {
    setEditing(menu);
    setOpen(true);
  };

  const activeCount = menus.filter((menu) => menu.active).length;
  const hiddenCount = menus.length - activeCount;

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Gastronomia</p>
          <h1 className="font-serif text-4xl mt-2">Cardápios</h1>
          <p className="mt-2 text-muted-foreground">
            Cadastre, edite e publique as opções que aparecem na área do cliente.
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
            <Button size="lg" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" />
              Novo cardápio
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">
                {editing ? "Editar cardápio" : "Novo cardápio"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={save} className="space-y-3">
              <div>
                <Label>Nome</Label>
                <Input name="name" required defaultValue={editing?.name ?? ""} />
              </div>
              <div>
                <Label>Categoria</Label>
                <Input
                  name="category"
                  required
                  placeholder="Entrada, Prato principal, ..."
                  defaultValue={editing?.category ?? ""}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Ex.: Jantar, Coquetel, Brunch, Infantil, Premium.
                </p>
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea
                  name="description"
                  rows={3}
                  placeholder="Resumo curto que será exibido para o cliente"
                  defaultValue={editing?.description ?? ""}
                />
              </div>
              <div>
                <Label>Itens do cardápio</Label>
                <Textarea
                  name="items"
                  rows={7}
                  placeholder={"Entrada: ...\nPrato principal: ...\nSobremesa: ..."}
                  defaultValue={editing?.items ?? ""}
                />
              </div>
              <div>
                <Label>Observações internas</Label>
                <Textarea name="notes" defaultValue={editing?.notes ?? ""} />
              </div>
              <div>
                <Label>Imagem (URL)</Label>
                <Input name="image_url" type="url" defaultValue={editing?.image_url ?? ""} />
              </div>
              <label className="flex items-center gap-2 rounded-xl border p-3 text-sm">
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

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="font-serif text-3xl">{menus.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Publicados</p>
            <p className="font-serif text-3xl text-gold">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Ocultos</p>
            <p className="font-serif text-3xl">{hiddenCount}</p>
          </CardContent>
        </Card>
      </div>

      {menus.length === 0 && (
        <Card className="border-gold/30">
          <CardContent className="flex flex-col items-center justify-center gap-4 p-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-champagne text-gold">
              <ChefHat className="h-8 w-8" />
            </div>
            <div>
              <h2 className="font-serif text-2xl">Cadastre o primeiro cardápio</h2>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Depois de publicado, ele aparece automaticamente em Cardápios na área do cliente.
              </p>
            </div>
            <Button size="lg" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Novo cardápio
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {menus.map((menu) => (
          <Card key={menu.id} className={!menu.active ? "opacity-70" : undefined}>
            <CardContent className="grid gap-4 p-4 lg:grid-cols-[160px_1fr_auto] lg:items-center">
              {menu.image_url ? (
                <div
                  className="h-32 rounded-xl bg-muted bg-cover bg-center lg:h-24"
                  style={{ backgroundImage: `url(${menu.image_url})` }}
                />
              ) : (
                <div className="flex h-32 items-center justify-center rounded-xl bg-muted text-gold lg:h-24">
                  <ImageIcon className="h-7 w-7" />
                </div>
              )}
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-serif text-2xl">{menu.name}</p>
                  <Badge variant="outline" className="capitalize">
                    {menu.category}
                  </Badge>
                  <Badge variant={menu.active ? "default" : "outline"}>
                    {menu.active ? "Publicado" : "Oculto"}
                  </Badge>
                </div>
                {menu.description && (
                  <p className="text-sm text-muted-foreground">{menu.description}</p>
                )}
                {menu.items && (
                  <p className="line-clamp-3 text-xs text-muted-foreground whitespace-pre-line">
                    {menu.items}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                <Button variant="outline" size="sm" onClick={() => openEdit(menu)}>
                  <Pencil className="h-3 w-3 mr-1" />
                  Editar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => toggleActive(menu)}>
                  {menu.active ? (
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
                  onClick={() => remove(menu.id)}
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
