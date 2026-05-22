import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/cardapios")({ component: Page });

function Page() {
  const [menus, setMenus] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("menus").select("*").order("created_at", { ascending: false });
    setMenus(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const create = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.from("menus").insert({
      name: String(fd.get("name")),
      category: String(fd.get("category")),
      description: String(fd.get("description") || "") || null,
      items: String(fd.get("items") || "") || null,
      image_url: String(fd.get("image_url") || "") || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Cardápio criado"); setOpen(false); load();
  };

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="font-serif text-4xl">Cardápios</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Novo</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-serif text-2xl">Novo cardápio</DialogTitle></DialogHeader>
            <form onSubmit={create} className="space-y-3">
              <div><Label>Nome</Label><Input name="name" required /></div>
              <div><Label>Categoria</Label><Input name="category" required placeholder="Entrada, Prato principal, ..." /></div>
              <div><Label>Descrição</Label><Textarea name="description" /></div>
              <div><Label>Itens</Label><Textarea name="items" placeholder="Lista de itens inclusos" /></div>
              <div><Label>Imagem (URL)</Label><Input name="image_url" /></div>
              <Button type="submit" className="w-full">Salvar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {menus.map((m) => (
          <Card key={m.id}>
            <CardContent className="p-4">
              <p className="font-serif text-xl">{m.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{m.category}</p>
              {m.description && <p className="text-sm mt-2">{m.description}</p>}
              <Button variant="ghost" size="sm" className="mt-2 text-rose" onClick={async () => { await supabase.from("menus").delete().eq("id", m.id); load(); }}>
                <Trash2 className="h-3 w-3 mr-1" />Excluir
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
