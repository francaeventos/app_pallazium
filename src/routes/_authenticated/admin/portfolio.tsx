import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  deletePortfolioFn,
  listPortfolioFn,
  savePortfolioFn,
  togglePortfolioFn,
} from "@/fns/admin-catalog";
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
import { StorageImagesTextarea } from "@/components/StorageImageInput";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Images, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
export const Route = createFileRoute("/_authenticated/admin/portfolio")({ component: Page });

type PortfolioItem = Awaited<ReturnType<typeof listPortfolioFn>>[number];

function Page() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PortfolioItem | null>(null);

  const load = async () => {
    try {
      setItems(await listPortfolioFn());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível carregar o portfólio.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      event_name: String(fd.get("event_name")),
      event_type: String(fd.get("event_type")),
      category: String(fd.get("category")),
      description: String(fd.get("description") || "") || null,
      highlights: String(fd.get("highlights") || "") || null,
      images: splitLines(String(fd.get("images") || "")),
      active: fd.get("active") === "on",
    };
    try {
      await savePortfolioFn({
        data: {
          id: editing?.id,
          ...payload,
          images: payload.images ?? [],
        },
      });
    } catch (error) {
      return toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    }
    toast.success(editing ? "Portfólio atualizado" : "Item publicado");
    setOpen(false);
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    try {
      await deletePortfolioFn({ data: { id } });
    } catch (error) {
      return toast.error(error instanceof Error ? error.message : "Não foi possível excluir.");
    }
    toast.success("Item removido");
    load();
  };

  const toggleActive = async (item: PortfolioItem) => {
    try {
      await togglePortfolioFn({ data: { id: item.id, active: !item.active } });
    } catch (error) {
      return toast.error(error instanceof Error ? error.message : "Não foi possível atualizar.");
    }
    toast.success(item.active ? "Item ocultado" : "Item publicado");
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
          <h1 className="font-serif text-4xl mt-2">Portfólio</h1>
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
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">
                {editing ? "Editar portfólio" : "Novo item"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={save} className="space-y-3">
              <div>
                <Label>Nome do evento</Label>
                <Input name="event_name" required defaultValue={editing?.event_name ?? ""} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipo</Label>
                  <Input name="event_type" required defaultValue={editing?.event_type ?? ""} />
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Input name="category" required defaultValue={editing?.category ?? ""} />
                </div>
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea name="description" defaultValue={editing?.description ?? ""} />
              </div>
              <div>
                <Label>Destaques</Label>
                <Textarea name="highlights" defaultValue={editing?.highlights ?? ""} />
              </div>
              <div>
                <StorageImagesTextarea
                  bucket="portfolio"
                  name="images"
                  label="Fotos do evento"
                  defaultValue={(editing?.images ?? []).join("\n")}
                  folder="eventos"
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
          icon={Images}
          title="Publique o primeiro item do portfólio"
          description="Mostre eventos já realizados, destaques e imagens para inspirar clientes dentro da área VIP."
          actionLabel="Novo item"
          onAction={openCreate}
        />
      )}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <Card key={item.id} className={!item.active ? "opacity-70" : undefined}>
            {item.images?.[0] && (
              <div
                className="h-36 bg-muted bg-cover bg-center"
                style={{ backgroundImage: `url(${item.images[0]})` }}
              />
            )}
            <CardContent className="p-4 space-y-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-serif text-xl">{item.event_name}</p>
                  <Badge variant={item.active ? "default" : "outline"}>
                    {item.active ? "Publicado" : "Oculto"}
                  </Badge>
                  <Badge variant="outline">{item.images?.length ?? 0} foto(s)</Badge>
                </div>
                <p className="text-xs text-muted-foreground capitalize">
                  {item.event_type} • {item.category}
                </p>
              </div>
              {item.description && <p className="text-sm">{item.description}</p>}
              {item.images && item.images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {item.images.slice(1, 5).map((image, index) => (
                    <div
                      key={`${image}-${index}`}
                      className="h-14 rounded-lg bg-muted bg-cover bg-center"
                      style={{ backgroundImage: `url(${image})` }}
                    />
                  ))}
                </div>
              )}
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

function splitLines(value: string) {
  const items = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return items.length > 0 ? items : null;
}
