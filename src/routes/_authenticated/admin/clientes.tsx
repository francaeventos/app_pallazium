import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Eye,
  Link2,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserCheck,
  Users,
  UserX,
  X,
  Mail,
  Phone,
  MessageCircle,
  IdCard,
  Calendar as CalendarIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { maskPhone, maskDocument, isValidEmail } from "@/lib/masks";

export const Route = createFileRoute("/_authenticated/admin/clientes")({ component: Page });

type Client = Database["public"]["Tables"]["clients"]["Row"];
type ClientStatus = Database["public"]["Enums"]["client_status"];
type LinkClientRpc = (
  fn: "link_client_to_auth_user_by_email",
  args: { _client_id: string },
) => Promise<{ error: { message: string } | null }>;

type StatusFilter = "all" | "ativo" | "inativo";

const statusBadge: Record<ClientStatus, { label: string; cls: string }> = {
  ativo: {
    label: "Ativo",
    cls: "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100",
  },
  inativo: { label: "Inativo", cls: "bg-muted text-muted-foreground border-border hover:bg-muted" },
  evento_concluido: {
    label: "Evento concluído",
    cls: "bg-champagne text-foreground border-gold/40 hover:bg-champagne",
  },
};

type FormState = {
  full_name: string;
  email: string;
  phone: string;
  whatsapp: string;
  document: string;
  notes: string;
  status: ClientStatus;
};

const emptyForm: FormState = {
  full_name: "",
  email: "",
  phone: "",
  whatsapp: "",
  document: "",
  notes: "",
  status: "ativo",
};

function Page() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [viewing, setViewing] = useState<Client | null>(null);
  const [removing, setRemoving] = useState<Client | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [saving, setSaving] = useState(false);

  const isEditMode = !!editing;

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });
    setClients(data ?? []);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  // Sync form when opening modal
  useEffect(() => {
    if (open && !editing) {
      setForm(emptyForm);
      setErrors({});
    }
  }, [open, editing]);

  useEffect(() => {
    if (editing) {
      setForm({
        full_name: editing.full_name,
        email: editing.email,
        phone: editing.phone ?? "",
        whatsapp: editing.whatsapp ?? "",
        document: editing.document ?? "",
        notes: editing.notes ?? "",
        status: editing.status,
      });
      setErrors({});
    }
  }, [editing]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (!q) return true;
      return (
        c.full_name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q) ||
        (c.whatsapp ?? "").toLowerCase().includes(q)
      );
    });
  }, [clients, query, statusFilter]);

  const hasFilters = query.trim() !== "" || statusFilter !== "all";

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.full_name.trim()) e.full_name = "Nome completo é obrigatório";
    else if (form.full_name.trim().length > 120) e.full_name = "Máximo 120 caracteres";
    if (!form.email.trim()) e.email = "E-mail é obrigatório";
    else if (!isValidEmail(form.email.trim())) e.email = "E-mail inválido";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    if (saving) return;
    if (!validate()) return;
    setSaving(true);
    const payload = {
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      whatsapp: form.whatsapp.trim() || null,
      document: form.document.trim() || null,
      notes: form.notes.trim() || null,
      status: form.status,
    };
    const { error } = isEditMode
      ? await supabase.from("clients").update(payload).eq("id", editing!.id)
      : await supabase.from("clients").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(isEditMode ? "Cliente atualizado" : "Cliente cadastrado");
    setOpen(false);
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
    toast.success("Status atualizado");
    load();
  };

  const confirmRemove = async () => {
    if (!removing) return;
    const { error } = await supabase.from("clients").delete().eq("id", removing.id);
    if (error) return toast.error(error.message);
    toast.success("Cliente excluído");
    setRemoving(null);
    load();
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="p-6 lg:p-10 space-y-8 max-w-6xl mx-auto">
      {/* Cabeçalho */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="font-serif text-4xl text-foreground">Clientes</h1>
          <p className="text-muted-foreground text-sm max-w-xl">
            Gerencie os clientes, contatos e informações vinculadas aos eventos.
          </p>
        </div>
        <Dialog
          open={open || isEditMode}
          onOpenChange={(v) => {
            if (!v) {
              setOpen(false);
              setEditing(null);
            } else {
              setOpen(true);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button
              size="lg"
              className="shadow-soft hover:shadow-luxe transition-shadow rounded-full px-6"
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo cliente
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-2xl p-0 gap-0 rounded-2xl shadow-luxe overflow-hidden border-gold/20">
            <DialogHeader className="px-6 pt-6 pb-4 border-b bg-card">
              <DialogTitle className="font-serif text-2xl">
                {isEditMode ? "Editar cliente" : "Novo cliente"}
              </DialogTitle>
              <DialogDescription>
                Cadastre as informações principais do cliente para vinculá-lo a eventos.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="flex flex-col">
              <div className="px-6 py-6 space-y-7 max-h-[65vh] overflow-y-auto">
                <Section title="Identificação">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field
                      label="Nome completo *"
                      error={errors.full_name}
                      input={
                        <Input
                          value={form.full_name}
                          maxLength={120}
                          placeholder="Ex: Maria Helena Souza"
                          className="h-11"
                          onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                        />
                      }
                    />
                    <Field
                      label="E-mail *"
                      error={errors.email}
                      input={
                        <Input
                          type="email"
                          value={form.email}
                          maxLength={255}
                          placeholder="cliente@email.com"
                          className="h-11"
                          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                        />
                      }
                    />
                  </div>
                </Section>

                <Section title="Contato">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field
                      label="Telefone"
                      input={
                        <Input
                          value={form.phone}
                          placeholder="(11) 9999-9999"
                          className="h-11"
                          onChange={(e) =>
                            setForm((f) => ({ ...f, phone: maskPhone(e.target.value) }))
                          }
                        />
                      }
                    />
                    <Field
                      label="WhatsApp"
                      input={
                        <Input
                          value={form.whatsapp}
                          placeholder="(11) 99999-9999"
                          className="h-11"
                          onChange={(e) =>
                            setForm((f) => ({ ...f, whatsapp: maskPhone(e.target.value) }))
                          }
                        />
                      }
                    />
                  </div>
                </Section>

                <Section title="Documento e status">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field
                      label="CPF/CNPJ"
                      input={
                        <Input
                          value={form.document}
                          placeholder="000.000.000-00"
                          className="h-11"
                          onChange={(e) =>
                            setForm((f) => ({ ...f, document: maskDocument(e.target.value) }))
                          }
                        />
                      }
                    />
                    <Field
                      label="Status"
                      input={
                        <Select
                          value={form.status}
                          onValueChange={(v) =>
                            setForm((f) => ({ ...f, status: v as ClientStatus }))
                          }
                        >
                          <SelectTrigger className="h-11">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ativo">Ativo</SelectItem>
                            <SelectItem value="inativo">Inativo</SelectItem>
                            <SelectItem value="evento_concluido">Evento concluído</SelectItem>
                          </SelectContent>
                        </Select>
                      }
                    />
                  </div>
                </Section>

                <Section title="Observações">
                  <Textarea
                    value={form.notes}
                    maxLength={1000}
                    rows={4}
                    placeholder="Preferências, restrições, anotações internas..."
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </Section>
              </div>

              <DialogFooter className="px-6 py-4 border-t bg-muted/30 gap-2 sm:gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setOpen(false);
                    setEditing(null);
                  }}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving} className="min-w-[160px] shadow-soft">
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {isEditMode ? "Salvar alterações" : "Salvar cliente"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      {/* Card da lista */}
      <Card className="rounded-2xl shadow-soft border-border/70 overflow-hidden">
        <div className="px-5 sm:px-6 py-5 border-b bg-gradient-to-b from-card to-muted/20">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-baseline gap-3">
              <h2 className="font-serif text-xl">Lista de clientes</h2>
              <span className="text-sm text-muted-foreground">
                {loading
                  ? "Carregando..."
                  : `${filtered.length} de ${clients.length} ${clients.length === 1 ? "cliente" : "clientes"}`}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <div className="relative flex-1 sm:w-72">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por nome, e-mail ou telefone"
                  className="pl-9 h-10"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as StatusFilter)}
              >
                <SelectTrigger className="h-10 sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="ativo">Ativos</SelectItem>
                  <SelectItem value="inativo">Inativos</SelectItem>
                </SelectContent>
              </Select>
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setQuery("");
                    setStatusFilter("all");
                  }}
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Limpar
                </Button>
              )}
            </div>
          </div>
        </div>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-10 text-center text-muted-foreground text-sm">
              <Loader2 className="h-5 w-5 animate-spin inline-block mr-2" />
              Carregando clientes...
            </div>
          ) : filtered.length === 0 && clients.length === 0 ? (
            <div className="p-4">
              <AdminEmptyState
                icon={Users}
                title="Cadastre o primeiro cliente"
                description="Clientes são a base para vincular acesso, criar eventos, checklists, interesses e notificações."
                actionLabel="Novo cliente"
                onAction={() => setOpen(true)}
              />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Nenhum cliente encontrado com os filtros atuais.
            </div>
          ) : (
            <ul className="divide-y">
              {filtered.map((c) => {
                const sb = statusBadge[c.status];
                return (
                  <li
                    key={c.id}
                    className="p-4 sm:px-6 sm:py-4 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-base text-foreground">{c.full_name}</p>
                          <Badge variant="outline" className={sb.cls}>
                            {sb.label}
                          </Badge>
                          {!c.user_id && (
                            <Badge
                              variant="outline"
                              className="bg-amber-50 text-amber-800 border-amber-200"
                            >
                              Sem conta
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <InfoBit icon={Mail} text={c.email} />
                          {c.phone && <InfoBit icon={Phone} text={c.phone} />}
                          {c.whatsapp && <InfoBit icon={MessageCircle} text={c.whatsapp} />}
                          {c.document && <InfoBit icon={IdCard} text={c.document} />}
                          <InfoBit icon={CalendarIcon} text={formatDate(c.created_at)} />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {!c.user_id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => linkByEmail(c.id)}
                            className="hidden sm:inline-flex"
                          >
                            <Link2 className="h-3.5 w-3.5 mr-1" />
                            Vincular
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => setEditing(c)}>
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          Editar
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => setViewing(c)}>
                              <Eye className="h-4 w-4 mr-2" /> Ver detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditing(c)}>
                              <Pencil className="h-4 w-4 mr-2" /> Editar
                            </DropdownMenuItem>
                            {!c.user_id && (
                              <DropdownMenuItem onClick={() => linkByEmail(c.id)}>
                                <Link2 className="h-4 w-4 mr-2" /> Vincular conta
                              </DropdownMenuItem>
                            )}
                            {c.status === "ativo" ? (
                              <DropdownMenuItem onClick={() => updateStatus(c.id, "inativo")}>
                                <UserX className="h-4 w-4 mr-2" /> Inativar
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => updateStatus(c.id, "ativo")}>
                                <UserCheck className="h-4 w-4 mr-2" /> Ativar
                              </DropdownMenuItem>
                            )}
                            {c.status !== "evento_concluido" && (
                              <DropdownMenuItem
                                onClick={() => updateStatus(c.id, "evento_concluido")}
                              >
                                <UserCheck className="h-4 w-4 mr-2" /> Marcar concluído
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setRemoving(c)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Detalhes */}
      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">{viewing?.full_name}</DialogTitle>
            <DialogDescription>Detalhes do cliente</DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="space-y-3 text-sm">
              <DetailRow label="E-mail" value={viewing.email} />
              <DetailRow label="Telefone" value={viewing.phone ?? "—"} />
              <DetailRow label="WhatsApp" value={viewing.whatsapp ?? "—"} />
              <DetailRow label="CPF/CNPJ" value={viewing.document ?? "—"} />
              <DetailRow label="Status" value={statusBadge[viewing.status].label} />
              <DetailRow label="Cadastrado em" value={formatDate(viewing.created_at)} />
              {viewing.notes && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    Observações
                  </p>
                  <p className="whitespace-pre-wrap">{viewing.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <AlertDialog open={!!removing} onOpenChange={(v) => !v && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Excluir <strong>{removing?.full_name}</strong> também removerá eventos, checklists e
              interesses vinculados. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="bg-champagne/30 border-gold/30 rounded-2xl">
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Field({
  label,
  input,
  error,
}: {
  label: string;
  input: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {input}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function InfoBit({
  icon: Icon,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="h-3 w-3" />
      {text}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/50 pb-2">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
