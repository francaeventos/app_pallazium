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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Bell, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/admin/notificacoes")({ component: Page });

type Notification = Database["public"]["Tables"]["notifications"]["Row"];
type Client = Pick<
  Database["public"]["Tables"]["clients"]["Row"],
  "id" | "full_name" | "email" | "user_id"
>;

function Page() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Notification | null>(null);
  const [selectedClientId, setSelectedClientId] = useState("");

  const load = async () => {
    const [{ data: notificationRows }, { data: clientRows }] = await Promise.all([
      supabase.from("notifications").select("*").order("created_at", { ascending: false }),
      supabase
        .from("clients")
        .select("id, full_name, email, user_id")
        .order("full_name", { ascending: true }),
    ]);
    setNotifications(notificationRows ?? []);
    setClients(clientRows ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const client = clients.find((item) => item.id === selectedClientId);
    if (!client?.user_id) {
      return toast.error("Este cliente ainda não está vinculado a uma conta de acesso.");
    }

    const payload = {
      user_id: client.user_id,
      title: String(fd.get("title")),
      message: String(fd.get("message") || "") || null,
      read: fd.get("read") === "on",
    };

    const { error } = editing
      ? await supabase.from("notifications").update(payload).eq("id", editing.id)
      : await supabase.from("notifications").insert(payload);

    if (error) return toast.error(error.message);
    toast.success(editing ? "Notificação atualizada" : "Notificação enviada");
    setOpen(false);
    setEditing(null);
    setSelectedClientId("");
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Notificação removida");
    load();
  };

  const clientByUser = new Map(clients.map((client) => [client.user_id, client]));

  const openCreate = () => {
    setEditing(null);
    setSelectedClientId("");
    setOpen(true);
  };

  const openEdit = (notification: Notification) => {
    const client = clients.find((item) => item.user_id === notification.user_id);
    setEditing(notification);
    setSelectedClientId(client?.id ?? "");
    setOpen(true);
  };

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Relacionamento
          </p>
          <h1 className="font-serif text-4xl mt-2">Notificações</h1>
          <p className="mt-2 text-muted-foreground">
            Envie avisos para clientes vinculados e acompanhe o que já foi lido.
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(value) => {
            setOpen(value);
            if (!value) {
              setEditing(null);
              setSelectedClientId("");
            }
          }}
        >
          <DialogTrigger asChild>
            <Button size="lg" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Nova notificação
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">
                {editing ? "Editar notificação" : "Nova notificação"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={save} className="space-y-4">
              <div>
                <Label>Cliente</Label>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente vinculado" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id} disabled={!client.user_id}>
                        {client.full_name} • {client.user_id ? client.email : "sem conta vinculada"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Título</Label>
                <Input name="title" required maxLength={120} defaultValue={editing?.title ?? ""} />
              </div>
              <div>
                <Label>Mensagem</Label>
                <Textarea
                  name="message"
                  rows={4}
                  maxLength={1000}
                  defaultValue={editing?.message ?? ""}
                />
              </div>
              {editing && (
                <label className="flex items-center gap-2 rounded-xl border p-3 text-sm">
                  <input name="read" type="checkbox" defaultChecked={editing.read} />
                  Marcar como lida
                </label>
              )}
              <Button type="submit" className="w-full">
                {editing ? "Salvar alterações" : "Enviar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {notifications.length === 0 && (
        <Card className="border-gold/30">
          <CardContent className="flex flex-col items-center justify-center gap-4 p-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-champagne text-gold">
              <Bell className="h-8 w-8" />
            </div>
            <div>
              <h2 className="font-serif text-2xl">Nenhuma notificação enviada</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Envie lembretes, avisos e atualizações para clientes com conta vinculada.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {notifications.map((notification) => {
          const client = clientByUser.get(notification.user_id);
          return (
            <Card key={notification.id}>
              <CardContent className="flex flex-wrap items-start justify-between gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-serif text-xl">{notification.title}</p>
                    <Badge variant={notification.read ? "outline" : "default"}>
                      {notification.read ? "Lida" : "Não lida"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {client?.full_name ?? "Usuário"} •{" "}
                    {format(new Date(notification.created_at), "dd/MM/yyyy HH:mm")}
                  </p>
                  {notification.message && (
                    <p className="mt-3 text-sm text-muted-foreground">{notification.message}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(notification)}>
                    <Pencil className="mr-1 h-3 w-3" />
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-rose"
                    onClick={() => remove(notification.id)}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
