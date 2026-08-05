import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  deletePartnerApplicationsFn,
  listPartnerApplicationsFn,
  updatePartnerApplicationFn,
} from "@/fns/partners/admin";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { ArrowLeft, Globe, Instagram, Mail, Phone, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { PARTNER_STATUS_LABEL } from "@/lib/partners";

export const Route = createFileRoute("/_authenticated/admin/leads/parceiros")({
  component: Page,
});

type Application = Awaited<ReturnType<typeof listPartnerApplicationsFn>>["applications"][number];

function WhatsAppLink({ phone }: { phone: string }) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return <span>{phone || "—"}</span>;
  return (
    <a
      href={`https://wa.me/${digits}`}
      target="_blank"
      rel="noreferrer"
      className="text-primary hover:underline"
      onClick={(e) => e.stopPropagation()}
    >
      {phone}
    </a>
  );
}

function Page() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [status, setStatus] = useState<string>("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Application | null>(null);
  const [notes, setNotes] = useState("");
  const [editStatus, setEditStatus] = useState<Application["status"]>("novo");
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    try {
      const result = await listPartnerApplicationsFn({
        data: {
          status: status === "all" ? undefined : (status as Application["status"]),
          q: q || undefined,
        },
      });
      setApplications(result.applications);
      setSelectedIds((prev) => {
        const ids = new Set(result.applications.map((a) => a.id));
        return new Set([...prev].filter((id) => ids.has(id)));
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar propostas.");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? new Set(applications.map((a) => a.id)) : new Set());
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    try {
      await deletePartnerApplicationsFn({ data: { ids: [...selectedIds] } });
      toast.success(
        selectedIds.size === 1 ? "Proposta excluída." : `${selectedIds.size} propostas excluídas.`,
      );
      setSelectedIds(new Set());
      setConfirmDelete(false);
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir propostas.");
    } finally {
      setDeleting(false);
    }
  };

  const openApplication = (app: Application) => {
    setSelected(app);
    setNotes(app.notes || "");
    setEditStatus(app.status as Application["status"]);
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await updatePartnerApplicationFn({
        data: { id: selected.id, notes, status: editStatus },
      });
      toast.success("Proposta atualizada");
      setSelected(null);
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
            <Link to="/admin/leads">
              <ArrowLeft className="h-4 w-4" /> Voltar para Leads
            </Link>
          </Button>
          <h1 className="font-serif text-3xl">🤝 Possíveis Parceiros</h1>
          <p className="text-sm text-muted-foreground">
            Propostas recebidas pela página pública /seja-parceiro
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedIds.size > 0 && (
            <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4" /> Excluir selecionadas ({selectedIds.size})
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-wrap gap-3 pt-6">
          <Input
            placeholder="Buscar nome, empresa, e-mail ou WhatsApp"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-xs"
          />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="novo">Novo</SelectItem>
              <SelectItem value="em_analise">Em análise</SelectItem>
              <SelectItem value="contatado">Contatado</SelectItem>
              <SelectItem value="descartado">Descartado</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={load}>Filtrar</Button>
        </CardContent>
      </Card>

      {applications.length > 0 && (
        <div className="flex items-center gap-2 px-1 text-sm text-muted-foreground">
          <Checkbox
            checked={selectedIds.size > 0 && selectedIds.size === applications.length}
            onCheckedChange={(v) => toggleSelectAll(v === true)}
          />
          <span>Selecionar todas</span>
        </div>
      )}

      <div className="grid gap-3">
        {applications.map((app) => (
          <Card
            key={app.id}
            className="cursor-pointer transition hover:border-primary/40"
            onClick={() => openApplication(app)}
          >
            <CardContent className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  className="mt-1"
                  checked={selectedIds.has(app.id)}
                  onCheckedChange={(v) => toggleSelected(app.id, v === true)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div>
                  <p className="font-medium">{app.company_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {app.contact_name} · {app.email} · {app.whatsapp}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {app.partnership_type} · {format(new Date(app.created_at), "dd/MM/yyyy HH:mm")}
                  </p>
                </div>
              </div>
              <Badge variant="outline">{PARTNER_STATUS_LABEL[app.status] || app.status}</Badge>
            </CardContent>
          </Card>
        ))}
        {applications.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Nenhuma proposta encontrada.
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[90vh] gap-0 overflow-hidden p-0 sm:max-w-xl rounded-2xl border-gold/20 shadow-luxe">
          {selected && (
            <>
              <DialogHeader className="border-b bg-card px-6 pb-4 pt-6">
                <div className="flex flex-wrap items-start justify-between gap-3 pr-6">
                  <div>
                    <DialogTitle className="font-serif text-2xl">{selected.company_name}</DialogTitle>
                    <DialogDescription className="mt-1">
                      Recebido em {format(new Date(selected.created_at), "dd/MM/yyyy HH:mm")}
                    </DialogDescription>
                  </div>
                  <Badge variant="outline">
                    {PARTNER_STATUS_LABEL[selected.status] || selected.status}
                  </Badge>
                </div>
              </DialogHeader>

              <div className="max-h-[65vh] space-y-6 overflow-y-auto px-6 py-5">
                <section className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-start gap-3 rounded-xl border bg-muted/30 p-3">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">E-mail</p>
                      <p className="truncate text-sm font-medium">{selected.email}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-xl border bg-muted/30 p-3">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">WhatsApp</p>
                      <p className="truncate text-sm font-medium">
                        <WhatsAppLink phone={selected.whatsapp} />
                      </p>
                    </div>
                  </div>
                </section>

                <dl className="divide-y rounded-xl border text-sm">
                  <div className="grid grid-cols-[minmax(7rem,38%)_1fr] gap-3 px-4 py-3">
                    <dt className="text-muted-foreground">Contato</dt>
                    <dd className="font-medium">{selected.contact_name}</dd>
                  </div>
                  <div className="grid grid-cols-[minmax(7rem,38%)_1fr] gap-3 px-4 py-3">
                    <dt className="text-muted-foreground">Tipo de parceria</dt>
                    <dd className="font-medium">{selected.partnership_type}</dd>
                  </div>
                  {selected.website ? (
                    <div className="grid grid-cols-[minmax(7rem,38%)_1fr] gap-3 px-4 py-3">
                      <dt className="flex items-center gap-1 text-muted-foreground">
                        <Globe className="h-3.5 w-3.5" /> Site
                      </dt>
                      <dd className="truncate font-medium">
                        <a
                          href={selected.website.startsWith("http") ? selected.website : `https://${selected.website}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline"
                        >
                          {selected.website}
                        </a>
                      </dd>
                    </div>
                  ) : null}
                  {selected.instagram ? (
                    <div className="grid grid-cols-[minmax(7rem,38%)_1fr] gap-3 px-4 py-3">
                      <dt className="flex items-center gap-1 text-muted-foreground">
                        <Instagram className="h-3.5 w-3.5" /> Instagram
                      </dt>
                      <dd className="font-medium">{selected.instagram}</dd>
                    </div>
                  ) : null}
                  <div className="grid grid-cols-[minmax(7rem,38%)_1fr] gap-3 px-4 py-3">
                    <dt className="text-muted-foreground">Proposta</dt>
                    <dd className="font-medium">{selected.description}</dd>
                  </div>
                </dl>

                <section className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={editStatus}
                      onValueChange={(v) => setEditStatus(v as Application["status"])}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="novo">Novo</SelectItem>
                        <SelectItem value="em_analise">Em análise</SelectItem>
                        <SelectItem value="contatado">Contatado</SelectItem>
                        <SelectItem value="descartado">Descartado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Notas internas</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Anotações da equipe…"
                    />
                  </div>
                </section>
              </div>

              <DialogFooter className="gap-2 border-t bg-card px-6 py-4">
                <Button variant="ghost" onClick={() => setSelected(null)}>
                  Fechar
                </Button>
                <Button onClick={save} disabled={saving}>
                  {saving ? "Salvando…" : "Salvar"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir {selectedIds.size === 1 ? "proposta" : `${selectedIds.size} propostas`}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                deleteSelected();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
