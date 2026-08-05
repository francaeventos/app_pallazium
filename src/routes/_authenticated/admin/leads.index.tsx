import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  deleteLeadsFn,
  exportLeadsCsvFn,
  getLeadFn,
  listLeadsFn,
  resendLeadWebhookFn,
  updateLeadFn,
} from "@/fns/leads/admin";
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
import {
  Calendar,
  Download,
  Mail,
  Phone,
  RefreshCw,
  Settings2,
  Trash2,
  UserSquare2,
  Webhook,
} from "lucide-react";
import { format, isValid, parseISO } from "date-fns";
import { formatLeadDateBr } from "@/lib/leads/date";
import { UTM_KEYS, UTM_LABELS, utmHasValues, type UtmKey } from "@/lib/leads/utm";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { temperatureLabel, type LeadTemperature } from "@/lib/leads/score";
import { LEAD_INTENT_LABEL, type LeadIntentValue } from "@/lib/leads/intent";

export const Route = createFileRoute("/_authenticated/admin/leads/")({ component: Page });

type Lead = Awaited<ReturnType<typeof listLeadsFn>>["leads"][number];
type LeadDetail = Awaited<ReturnType<typeof getLeadFn>>["lead"];

const STATUS_LABEL: Record<string, string> = {
  parcial: "Parcial",
  completo: "Completo",
  agendado: "Agendado",
  descartado: "Descartado",
};

const ANSWER_LABEL: Record<string, string> = {
  nome: "Nome",
  email: "E-mail",
  whatsapp: "WhatsApp",
  tipoEvento: "Tipo de evento",
  convidados: "Convidados",
  dataEvento: "Data do evento",
  investimento: "Investimento",
  Procura: "O que buscava",
  parceria_nome: "Nome/empresa (parceria)",
  parceria_tipo: "Tipo de parceria",
  parceria_descricao: "Como imagina a parceria",
  parceria_contato_forma: "Forma de contato preferida",
  parceria_email: "E-mail (parceria)",
  parceria_telefone: "Telefone (parceria)",
};

const EVENT_LABEL: Record<string, string> = {
  partial_created: "Contato iniciado",
  completed: "Quiz concluído",
  qualified: "Qualificado",
  scheduled: "Horário reservado",
  webhook_sent: "Webhook enviado",
  webhook_failed: "Falha no webhook",
  capi_sent: "Meta CAPI enviado",
  capi_failed: "Falha no Meta CAPI",
};

function answerLabel(key: string) {
  return ANSWER_LABEL[key] || key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

function formatAnswerValue(key: string, value: unknown) {
  if (value == null || value === "") return "—";
  const str = String(value);
  if (
    key === "dataEvento" ||
    key === "data" ||
    /^\d{4}-\d{2}-\d{2}$/.test(str) ||
    /^\d{2}\/\d{2}\/\d{4}$/.test(str)
  ) {
    const br = formatLeadDateBr(str);
    if (br) return br;
  }
  return str;
}

function temperatureBadgeClass(temperature: string) {
  switch (temperature) {
    case "muito_quente":
      return "border-transparent bg-gold text-background hover:bg-gold/90";
    case "quente":
      return "border-transparent bg-primary text-primary-foreground hover:bg-primary/90";
    case "morno":
      return "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/90";
    default:
      return "";
  }
}

function TemperatureBadge({ temperature }: { temperature: string }) {
  return (
    <Badge variant={temperature === "frio" ? "outline" : "default"} className={temperatureBadgeClass(temperature)}>
      {temperatureLabel((temperature as LeadTemperature) || "frio")}
    </Badge>
  );
}

function IntentBadge({ intent }: { intent?: string }) {
  const value = (intent || "evento") as LeadIntentValue;
  if (value === "evento") return null;
  return <Badge variant="outline">{LEAD_INTENT_LABEL[value] || value}</Badge>;
}

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
  const [leads, setLeads] = useState<Lead[]>([]);
  const [status, setStatus] = useState<string>("all");
  const [intent, setIntent] = useState<string>("all");
  const [qualified, setQualified] = useState<string>("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<LeadDetail | null>(null);
  const [notes, setNotes] = useState("");
  const [editStatus, setEditStatus] = useState<Lead["status"]>("parcial");
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    try {
      const result = await listLeadsFn({
        data: {
          slug: "leads",
          status: status === "all" ? undefined : (status as Lead["status"]),
          intent: intent === "all" ? undefined : (intent as LeadIntentValue),
          qualified: qualified as "true" | "false" | "all",
          q: q || undefined,
        },
      });
      setLeads(result.leads);
      setSelectedIds((prev) => {
        const ids = new Set(result.leads.map((l) => l.id));
        const next = new Set([...prev].filter((id) => ids.has(id)));
        return next;
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar leads.");
    }
  };

  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? new Set(leads.map((l) => l.id)) : new Set());
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    try {
      await deleteLeadsFn({ data: { ids: [...selectedIds] } });
      toast.success(
        selectedIds.size === 1 ? "Lead excluído." : `${selectedIds.size} leads excluídos.`,
      );
      setSelectedIds(new Set());
      setConfirmDelete(false);
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir leads.");
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openLead = async (id: string) => {
    try {
      const { lead } = await getLeadFn({ data: { id } });
      setSelected(lead);
      setNotes(lead.notes || "");
      setEditStatus(lead.status as Lead["status"]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao abrir lead.");
    }
  };

  const saveLead = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await updateLeadFn({
        data: { id: selected.id, notes, status: editStatus as Lead["status"] },
      });
      toast.success("Lead atualizado");
      setSelected(null);
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = async () => {
    try {
      const { csv } = await exportLeadsCsvFn({ data: { slug: "leads" } });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads-${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro no export.");
    }
  };

  const resendWebhook = async () => {
    if (!selected) return;
    try {
      await resendLeadWebhookFn({ data: { id: selected.id } });
      toast.success("Webhook reenviado");
      openLead(selected.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha no webhook.");
    }
  };

  const answerEntries = selected
    ? Object.entries(selected.answers || {}).filter(([, v]) => v != null && String(v).trim() !== "")
    : [];
  const utmEntries = selected
    ? UTM_KEYS.map((key) => [key, selected.utm?.[key]] as const).filter(
        ([, v]) => v != null && String(v).trim() !== "",
      )
    : [];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl">Leads</h1>
          <p className="text-sm text-muted-foreground">Quiz conversacional e score de qualificação</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedIds.size > 0 && (
            <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4" /> Excluir selecionados ({selectedIds.size})
            </Button>
          )}
          <Button asChild>
            <Link to="/admin/leads/formulario">
              <Settings2 className="h-4 w-4" /> Editar formulário
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/admin/leads/integracoes">
              <Webhook className="h-4 w-4" /> Integrações
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/admin/leads/candidaturas">
              <UserSquare2 className="h-4 w-4" /> Trabalhe Conosco
            </Link>
          </Button>
          <Button variant="outline" onClick={exportCsv}>
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" onClick={load}>
            <RefreshCw className="h-4 w-4" /> Atualizar
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-wrap gap-3 pt-6">
          <Input
            placeholder="Buscar nome, e-mail ou WhatsApp"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-xs"
          />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="parcial">Parcial</SelectItem>
              <SelectItem value="completo">Completo</SelectItem>
              <SelectItem value="agendado">Agendado</SelectItem>
              <SelectItem value="descartado">Descartado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={intent} onValueChange={setIntent}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Intenção" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas intenções</SelectItem>
              <SelectItem value="evento">💍 Evento</SelectItem>
              <SelectItem value="parceria">🤝 Parceria</SelectItem>
              <SelectItem value="trabalhe_conosco">👥 Trabalhe Conosco</SelectItem>
            </SelectContent>
          </Select>
          <Select value={qualified} onValueChange={setQualified}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Qualificação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="true">Qualificados</SelectItem>
              <SelectItem value="false">Não qualificados</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={load}>Filtrar</Button>
        </CardContent>
      </Card>

      {leads.length > 0 && (
        <div className="flex items-center gap-2 px-1 text-sm text-muted-foreground">
          <Checkbox
            checked={selectedIds.size > 0 && selectedIds.size === leads.length}
            onCheckedChange={(v) => toggleSelectAll(v === true)}
          />
          <span>Selecionar todos</span>
        </div>
      )}

      <div className="grid gap-3">
        {leads.map((lead) => (
          <Card
            key={lead.id}
            className="cursor-pointer transition hover:border-primary/40"
            onClick={() => openLead(lead.id)}
          >
            <CardContent className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  className="mt-1"
                  checked={selectedIds.has(lead.id)}
                  onCheckedChange={(v) => toggleSelected(lead.id, v === true)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div>
                  <p className="font-medium">{lead.name || "Sem nome"}</p>
                  <p className="text-sm text-muted-foreground">
                    {lead.email || "—"} · {lead.whatsapp || "—"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {format(new Date(lead.created_at), "dd/MM/yyyy HH:mm")}
                    {utmHasValues(lead.utm)
                      ? ` · ${
                          [lead.utm.utm_source, lead.utm.utm_campaign]
                            .filter(Boolean)
                            .map(String)
                            .join(" / ") || "utm"
                        }`
                      : ""}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <IntentBadge intent={lead.intent} />
                <Badge variant="outline">{STATUS_LABEL[lead.status] || lead.status}</Badge>
                <TemperatureBadge temperature={lead.temperature} />
                <Badge variant={lead.qualified ? "default" : "secondary"}>
                  Score {lead.score}
                  {lead.qualified ? " · Qualificado" : ""}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
        {leads.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Nenhum lead encontrado.
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
                    <DialogTitle className="font-serif text-2xl">
                      {selected.name || "Lead sem nome"}
                    </DialogTitle>
                    <DialogDescription className="mt-1">
                      Recebido em{" "}
                      {format(new Date(selected.created_at), "dd MMM yyyy · HH:mm", {
                        locale: ptBR,
                      })}
                    </DialogDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <IntentBadge intent={selected.intent} />
                    <Badge variant="outline">{STATUS_LABEL[selected.status] || selected.status}</Badge>
                    <TemperatureBadge temperature={selected.temperature} />
                    <Badge variant={selected.qualified ? "default" : "secondary"}>
                      Score {selected.score}
                      {selected.qualified ? " · Qualificado" : " · Não qualificado"}
                    </Badge>
                  </div>
                </div>
              </DialogHeader>

              <div className="max-h-[65vh] space-y-6 overflow-y-auto px-6 py-5">
                <section className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-start gap-3 rounded-xl border bg-muted/30 p-3">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">E-mail</p>
                      <p className="truncate text-sm font-medium">{selected.email || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-xl border bg-muted/30 p-3">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">WhatsApp</p>
                      <p className="truncate text-sm font-medium">
                        <WhatsAppLink phone={selected.whatsapp || ""} />
                      </p>
                    </div>
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                    Respostas do quiz
                  </h3>
                  {answerEntries.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma resposta registrada.</p>
                  ) : (
                    <dl className="divide-y rounded-xl border">
                      {answerEntries.map(([key, value]) => (
                        <div
                          key={key}
                          className="grid grid-cols-[minmax(7rem,38%)_1fr] gap-3 px-4 py-3 text-sm"
                        >
                          <dt className="text-muted-foreground">{answerLabel(key)}</dt>
                          <dd className="font-medium text-foreground">
                            {formatAnswerValue(key, value)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </section>

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                    UTM / atribuição
                  </h3>
                  {utmEntries.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma UTM capturada nesta visita.
                    </p>
                  ) : (
                    <dl className="divide-y rounded-xl border">
                      {utmEntries.map(([key, value]) => (
                        <div
                          key={key}
                          className="grid grid-cols-[minmax(7rem,38%)_1fr] gap-3 px-4 py-3 text-sm"
                        >
                          <dt className="text-muted-foreground">
                            {UTM_LABELS[key as UtmKey] || key}
                          </dt>
                          <dd className="break-all font-medium text-foreground">{String(value)}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  {selected.source_url ? (
                    <p className="break-all text-xs text-muted-foreground">
                      URL: {selected.source_url}
                    </p>
                  ) : null}
                </section>

                <section className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={editStatus}
                      onValueChange={(v) => setEditStatus(v as Lead["status"])}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="parcial">Parcial</SelectItem>
                        <SelectItem value="completo">Completo</SelectItem>
                        <SelectItem value="agendado">Agendado</SelectItem>
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

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                    Histórico
                  </h3>
                  {(selected.events || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sem eventos ainda.</p>
                  ) : (
                    <ol className="relative space-y-0 border-l border-border pl-4">
                      {(selected.events || []).map((ev) => (
                        <li key={ev.id} className="relative pb-4 last:pb-0">
                          <span className="absolute -left-[1.28rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <p className="text-sm font-medium">
                              {EVENT_LABEL[ev.type] || ev.type}
                            </p>
                            <time className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(ev.created_at), "dd/MM/yyyy HH:mm")}
                            </time>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </section>
              </div>

              <DialogFooter className="gap-2 border-t bg-card px-6 py-4 sm:justify-between">
                <div>
                  {selected.qualified && (
                    <Button variant="outline" onClick={resendWebhook}>
                      <Webhook className="h-4 w-4" /> Reenviar webhook
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setSelected(null)}>
                    Fechar
                  </Button>
                  <Button onClick={saveLead} disabled={saving}>
                    {saving ? "Salvando…" : "Salvar"}
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir {selectedIds.size === 1 ? "lead" : `${selectedIds.size} leads`}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. Os leads selecionados e todo o histórico
              associado serão apagados permanentemente.
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
