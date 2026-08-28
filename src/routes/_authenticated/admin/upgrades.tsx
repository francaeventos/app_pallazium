import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  deleteUpgradeFn,
  listUpgradesFn,
  saveUpgradeFn,
  toggleUpgradeFn,
} from "@/fns/admin-catalog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AdminEmptyState } from "@/components/AdminEmptyState";
import { StorageImageInput } from "@/components/StorageImageInput";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
export const Route = createFileRoute("/_authenticated/admin/upgrades")({ component: Page });

type Upgrade = Awaited<ReturnType<typeof listUpgradesFn>>[number];

function Page() {
  const [items, setItems] = useState<Upgrade[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Upgrade | null>(null);

  const load = async () => {
    try {
      setItems(await listUpgradesFn());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível carregar os adicionais.");
    }
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
      price_text: String(fd.get("price_text") || "") || null,
      image_url: String(fd.get("image_url") || "") || null,
      active: fd.get("active") === "on",
    };
    try {
      await saveUpgradeFn({ data: { id: editing?.id, ...payload } });
    } catch (error) {
      return toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    }
    toast.success(editing ? "Adicional atualizado" : "Adicional criado");
    setOpen(false);
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    try {
      await deleteUpgradeFn({ data: { id } });
    } catch (error) {
      return toast.error(error instanceof Error ? error.message : "Não foi possível excluir.");
    }
    toast.success("Adicional excluído");
    load();
  };

  const toggleActive = async (item: Upgrade) => {
    try {
      await toggleUpgradeFn({ data: { id: item.id, active: !item.active } });
    } catch (error) {
      return toast.error(error instanceof Error ? error.message : "Não foi possível atualizar.");
    }
    toast.success(item.active ? "Adicional ocultado" : "Adicional publicado");
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
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Comercial</p>
          <h1 className="font-serif text-4xl mt-2">Adicionais</h1>
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
              Novo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">
                {editing ? "Editar adicional" : "Novo adicional"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={save} className="space-y-3">
              <div>
                <Label>Nome</Label>
                <Input name="name" required defaultValue={editing?.name ?? ""} />
              </div>
              <div>
                <Label>Categoria</Label>
                <Input name="category" required defaultValue={editing?.category ?? ""} />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea name="description" defaultValue={editing?.description ?? ""} />
              </div>
              <div>
                <Label>Valor / texto</Label>
                <Input
                  name="price_text"
                  placeholder="A partir de R$ ..."
                  defaultValue={editing?.price_text ?? ""}
                />
              </div>
              <div>
                <StorageImageInput
                  bucket="catalogos"
                  name="image_url"
                  label="Imagem"
                  defaultValue={editing?.image_url ?? ""}
                  folder="upgrades"
                  recommendedSize="1200 x 900 pixels"
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
          icon={Sparkles}
          title="Cadastre o primeiro adicional"
          description="Publique experiências extras, serviços premium e adicionais comerciais para o cliente demonstrar interesse."
          actionLabel="Novo adicional"
          onAction={openCreate}
        />
      )}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((m) => (
          <Card key={m.id} className={!m.active ? "opacity-70" : undefined}>
            {m.image_url && (
              <div
                className="h-36 bg-muted bg-cover bg-center"
                style={{ backgroundImage: `url(${m.image_url})` }}
              />
            )}
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-serif text-xl">{m.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{m.category}</p>
                </div>
                <Badge variant={m.active ? "default" : "outline"}>
                  {m.active ? "Ativo" : "Oculto"}
                </Badge>
              </div>
              {m.description && <p className="text-sm mt-2">{m.description}</p>}
              {m.price_text && <p className="text-sm text-gold mt-2">{m.price_text}</p>}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditing(m);
                    setOpen(true);
                  }}
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  Editar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => toggleActive(m)}>
                  {m.active ? (
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
                  onClick={() => remove(m.id)}
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
