import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/clientes")({ component: Page });

function Page() {
  const [clients, setClients] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
    setClients(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const create = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.from("clients").insert({
      full_name: String(fd.get("full_name")),
      email: String(fd.get("email")),
      phone: String(fd.get("phone") || "") || null,
      whatsapp: String(fd.get("whatsapp") || "") || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Cliente cadastrado");
    setOpen(false);
    load();
  };

  return (
    <div className="p-6 lg:p-10 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-serif text-4xl">Clientes</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Novo cliente</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-serif text-2xl">Novo cliente</DialogTitle></DialogHeader>
            <form onSubmit={create} className="space-y-4">
              <div><Label>Nome completo</Label><Input name="full_name" required maxLength={120} /></div>
              <div><Label>E-mail</Label><Input name="email" type="email" required maxLength={255} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Telefone</Label><Input name="phone" maxLength={30} /></div>
                <div><Label>WhatsApp</Label><Input name="whatsapp" maxLength={30} /></div>
              </div>
              <Button type="submit" className="w-full">Salvar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="font-serif text-xl">Lista</CardTitle></CardHeader>
        <CardContent className="divide-y">
          {clients.length === 0 && <p className="text-sm text-muted-foreground py-2">Nenhum cliente cadastrado.</p>}
          {clients.map((c) => (
            <div key={c.id} className="py-3 flex items-center justify-between">
              <div>
                <p className="font-medium">{c.full_name}</p>
                <p className="text-xs text-muted-foreground">{c.email} {c.phone && `• ${c.phone}`}</p>
                {!c.user_id && <p className="text-xs text-rose mt-0.5">Sem conta vinculada</p>}
              </div>
              <span className="text-xs uppercase tracking-wider text-muted-foreground">{c.status.replace("_", " ")}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-champagne/30 border-gold/30">
        <CardContent className="p-5 text-sm text-muted-foreground">
          <p><strong className="text-foreground">Dica:</strong> peça ao cliente para criar a conta com o mesmo e-mail. Depois, vá em <em>Eventos</em> e edite o cliente para vincular o usuário usando o ID (em breve, vínculo automático por e-mail).</p>
        </CardContent>
      </Card>
    </div>
  );
}
