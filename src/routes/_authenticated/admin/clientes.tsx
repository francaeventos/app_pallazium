import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Link2, Pencil, Plus, Trash2, UserCheck, Users, UserX } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/admin/clientes")({ component: Page });

type Client = Database["public"]["Tables"]["clients"]["Row"];
type ClientStatus = Database["public"]["Enums"]["client_status"];
type LinkClientRpc = (
  fn: "link_client_to_auth_user_by_email",
  args: { _client_id: string },
) => Promise<{ error: { message: string } | null }>;

function Page() {
  const [clients, setClients] = useState<Client[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [createStatus, setCreateStatus] = useState<ClientStatus>("ativo");
  const [editStatus, setEditStatus] = useState<ClientStatus>("ativo");

  const load = async () => {
    const { data } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });
    setClients(data ?? []);
  };
  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!editing) return;
    setEditStatus(editing.status);
  }, [editing]);

  const create = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.from("clients").insert({
      full_name: String(fd.get("full_name")),
      email: String(fd.get("email")),
      phone: String(fd.get("phone") || "") || null,
      whatsapp: String(fd.get("whatsapp") || "") || null,
      document: String(fd.get("document") || "") || null,
      notes: String(fd.get("notes") || "") || null,
      status: createStatus,
    });
    if (error) return toast.error(error.message);
    toast.success("Cliente cadastrado");
    setOpen(false);
    setCreateStatus("ativo");
    load();
  };

  const update = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editing) return;
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase
      .from("clients")
      .update({
        full_name: String(fd.get("full_name")),
        email: String(fd.get("email")),
        phone: String(fd.get("phone") || "") || null,
        whatsapp: String(fd.get("whatsapp") || "") || null,
        document: String(fd.get("document") || "") || null,
        notes: String(fd.get("notes") || "") || null,
        status: editStatus,
      })
      .eq("id", editing.id);
    if (error) return toast.error(error.message);
    toast.success("Cliente atualizado");
    setEditing(null);
    load();
  };

  const linkByEmail = async (clientId: string) => {
    const linkClient = supabase.rpc as unknown as LinkClientRpc;
    const { error } = await linkClient("link_client_to_auth_user_by_email", {
      _client_id: clientId,
    });
    if (error) return toast.error(error.message);
    toast.success("Conta vinculada pelo e-mail");
    load();
  };

  const updateStatus = async (clientId: string, status: ClientStatus) => {
    const { error } = await supabase.from("clients").update({ status }).eq("id", clientId);
    if (error) return toast.error(error.message);
    toast.success("Status do cliente atualizado");
    load();
  };

  const remove = async (client: Client) => {
    const confirmed = window.confirm(
      `Excluir ${client.full_name}? Isso também remove eventos, checklists e interesses vinculados a este cliente.`,
    );
    if (!confirmed) return;
    const { error } = await supabase.from("clients").delete().eq("id", client.id);
    if (error) return toast.error(error.message);
    toast.success("Cliente excluído");
    load();
  };

  return (
    <div className="p-6 lg:p-10 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-serif text-4xl">Clientes</h1>
        <Dialog
          open={open}
          onOpenChange={(value) => {
            setOpen(value);
            if (!value) setCreateStatus("ativo");
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              Novo cliente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">Novo cliente</DialogTitle>
            </DialogHeader>
            <form onSubmit={create} className="space-y-4">
              <div>
                <Label>Nome completo</Label>
                <Input name="full_name" required maxLength={120} />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input name="email" type="email" required maxLength={255} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Telefone</Label>
                  <Input name="phone" maxLength={30} />
                </div>
                <div>
                  <Label>WhatsApp</Label>
                  <Input name="whatsapp" maxLength={30} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>CPF/CNPJ</Label>
                  <Input name="document" maxLength={30} />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={createStatus}
                    onValueChange={(value) => setCreateStatus(value as ClientStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                      <SelectItem value="evento_concluido">Evento concluído</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea name="notes" maxLength={1000} />
              </div>
              <Button type="submit" className="w-full">
                Salvar
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-xl">Lista</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {clients.length === 0 && (
            <AdminEmptyState
              icon={Users}
              title="Cadastre o primeiro cliente"
              description="Clientes são a base para vincular acesso, criar eventos, checklists, interesses e notificações."
              actionLabel="Novo cliente"
              onAction={() => setOpen(true)}
            />
          )}
          {clients.map((c) => (
            <div key={c.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{c.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.email} {c.phone && `• ${c.phone}`}
                </p>
                {!c.user_id && <p className="text-xs text-rose mt-0.5">Sem conta vinculada</p>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  {c.status.replace("_", " ")}
                </span>
                {!c.user_id && (
                  <Button variant="outline" size="sm" onClick={() => linkByEmail(c.id)}>
                    <Link2 className="h-3 w-3 mr-1" />
                    Vincular
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setEditing(c)}>
                  <Pencil className="h-3 w-3 mr-1" />
                  Editar
                </Button>
                {c.status === "ativo" ? (
                  <Button variant="ghost" size="sm" onClick={() => updateStatus(c.id, "inativo")}>
                    <UserX className="h-3 w-3 mr-1" />
                    Inativar
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => updateStatus(c.id, "ativo")}>
                    <UserCheck className="h-3 w-3 mr-1" />
                    Ativar
                  </Button>
                )}
                {c.status !== "evento_concluido" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateStatus(c.id, "evento_concluido")}
                  >
                    Concluir
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="text-rose" onClick={() => remove(c)}>
                  <Trash2 className="h-3 w-3 mr-1" />
                  Excluir
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(value) => !value && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Editar cliente</DialogTitle>
          </DialogHeader>
          {editing && (
            <form onSubmit={update} className="space-y-4">
              <div>
                <Label>Nome completo</Label>
                <Input name="full_name" required maxLength={120} defaultValue={editing.full_name} />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input
                  name="email"
                  type="email"
                  required
                  maxLength={255}
                  defaultValue={editing.email}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Telefone</Label>
                  <Input name="phone" maxLength={30} defaultValue={editing.phone ?? ""} />
                </div>
                <div>
                  <Label>WhatsApp</Label>
                  <Input name="whatsapp" maxLength={30} defaultValue={editing.whatsapp ?? ""} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>CPF/CNPJ</Label>
                  <Input name="document" maxLength={30} defaultValue={editing.document ?? ""} />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={editStatus}
                    onValueChange={(value) => setEditStatus(value as ClientStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                      <SelectItem value="evento_concluido">Evento concluído</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea name="notes" maxLength={1000} defaultValue={editing.notes ?? ""} />
              </div>
              <Button type="submit" className="w-full">
                Salvar alterações
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Card className="bg-champagne/30 border-gold/30">
        <CardContent className="p-5 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Dica:</strong> após liberar a conta no Supabase
            Auth, cadastre o cliente com o mesmo e-mail e use o botão <em>Vincular</em>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
