import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  deletePartnerFn,
  listPartnersFn,
  savePartnerFn,
  togglePartnerFn,
} from "@/fns/admin-catalog";
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
import { StorageImageInput, StorageImagesTextarea } from "@/components/StorageImageInput";
import { Eye, EyeOff, Handshake, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
export const Route = createFileRoute("/_authenticated/admin/parceiros")({ component: Page });

type Partner = Awaited<ReturnType<typeof listPartnersFn>>[number];

function Page() {
  const [items, setItems] = useState<Partner[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partner | null>(null);

  const load = async () => {
    try {
      setItems(await listPartnersFn());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível carregar os parceiros.");
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
      email: String(fd.get("email") || "") || null,
      phone: String(fd.get("phone") || "") || null,
      whatsapp: String(fd.get("whatsapp") || "") || null,
      instagram: String(fd.get("instagram") || "") || null,
      website_url: String(fd.get("website_url") || "") || null,
      image_url: String(fd.get("image_url") || "") || null,
      logo_url: String(fd.get("logo_url") || "") || null,
      gallery_urls: String(fd.get("gallery_urls") || "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 4),
      active: fd.get("active") === "on",
    };
    try {
      await savePartnerFn({ data: { id: editing?.id, ...payload } });
    } catch (error) {
      return toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    }
    toast.success(editing ? "Parceiro atualizado" : "Parceiro criado");
    setOpen(false);
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    try {
      await deletePartnerFn({ data: { id } });
    } catch (error) {
      return toast.error(error instanceof Error ? error.message : "Não foi possível excluir.");
    }
    toast.success("Parceiro excluído");
    load();
  };

  const toggleActive = async (item: Partner) => {
    try {
      await togglePartnerFn({ data: { id: item.id, active: !item.active } });
    } catch (error) {
      return toast.error(error instanceof Error ? error.message : "Não foi possível atualizar.");
    }
    toast.success(item.active ? "Parceiro ocultado" : "Parceiro publicado");
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
          <h1 className="font-serif text-4xl mt-2">Parceiros</h1>
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
                {editing ? "Editar parceiro" : "Novo parceiro"}
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Telefone</Label>
                  <Input name="phone" defaultValue={editing?.phone ?? ""} />
                </div>
                <div>
                  <Label>WhatsApp</Label>
                  <Input name="whatsapp" defaultValue={editing?.whatsapp ?? ""} />
                </div>
              </div>
              <div>
                <Label>Instagram</Label>
                <Input name="instagram" defaultValue={editing?.instagram ?? ""} />
              </div>
              <div>
                <Label>Site</Label>
                <Input
                  name="website_url"
                  type="url"
                  placeholder="https://..."
                  defaultValue={editing?.website_url ?? ""}
                />
              </div>
              <div>
                <Label>E-mail de acesso do parceiro</Label>
                <Input name="email" type="email" defaultValue={editing?.email ?? ""} />
                <p className="mt-1 text-xs text-muted-foreground">
                  O parceiro cria a conta com este e-mail em /login para editar o próprio perfil,
                  ou pode ser vinculado depois em Acessos.
                </p>
              </div>
              <div>
                <StorageImageInput
                  bucket="catalogos"
                  name="image_url"
                  label="Imagem principal"
                  defaultValue={editing?.image_url ?? ""}
                  folder="parceiros"
                  recommendedSize="600 x 600 pixels"
                />
              </div>
              <div>
                <StorageImageInput
                  bucket="catalogos"
                  name="logo_url"
                  label="Logo"
                  defaultValue={editing?.logo_url ?? ""}
                  folder="parceiros/logos"
                  recommendedSize="400 x 400 pixels"
                />
              </div>
              <div>
                <StorageImagesTextarea
                  bucket="catalogos"
                  name="gallery_urls"
                  label="Galeria de fotos"
                  defaultValue={(editing?.gallery_urls ?? []).join("\n")}
                  folder="parceiros/galeria"
                  maxImages={4}
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
          icon={Handshake}
          title="Cadastre o primeiro parceiro"
          description="Monte uma vitrine de fornecedores recomendados para facilitar as próximas decisões do cliente."
          actionLabel="Novo parceiro"
          onAction={openCreate}
        />
      )}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <Card key={item.id} className={!item.active ? "opacity-70" : undefined}>
            {item.image_url && (
              <div
                className="aspect-square w-full bg-muted bg-cover bg-center"
                style={{ backgroundImage: `url(${item.image_url})` }}
              />
            )}
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-serif text-xl">{item.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{item.category}</p>
                </div>
                <Badge variant={item.active ? "default" : "outline"}>
                  {item.active ? "Ativo" : "Oculto"}
                </Badge>
              </div>
              {item.description && <p className="text-sm">{item.description}</p>}
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
