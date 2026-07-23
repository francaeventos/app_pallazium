import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  exportLeadsCsvFn,
  getLeadFn,
  listLeadsFn,
  resendLeadWebhookFn,
  updateLeadFn,
} from "@/fns/leads/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { Download, RefreshCw, Settings2, Webhook } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/leads")({ component: Page });

type Lead = Awaited<ReturnType<typeof listLeadsFn>>["leads"][number];
type LeadDetail = Awaited<ReturnType<typeof getLeadFn>>["lead"];

function Page() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [status, setStatus] = useState<string>("all");
  const [qualified, setQualified] = useState<string>("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<LeadDetail | null>(null);
  const [notes, setNotes] = useState("");
  const [editStatus, setEditStatus] = useState<Lead["status"]>("parcial");

  const load = async () => {
    try {
      const result = await listLeadsFn({
        data: {
          slug: "leads",
          status: status === "all" ? undefined : (status as Lead["status"]),
          qualified: qualified as "true" | "false" | "all",
          q: q || undefined,
        },
      });
      setLeads(result.leads);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar leads.");
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
    try {
      await updateLeadFn({
        data: { id: selected.id, notes, status: editStatus as Lead["status"] },
      });
      toast.success("Lead atualizado");
      setSelected(null);
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar.");
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl">Leads</h1>
          <p className="text-sm text-muted-foreground">Quiz conversacional e score de qualificação</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link to="/admin/leads/formulario">
              <Settings2 className="h-4 w-4" /> Formulário
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/admin/leads/integracoes">
              <Webhook className="h-4 w-4" /> Integrações
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

      <div className="grid gap-3">
        {leads.map((lead) => (
          <Card
            key={lead.id}
            className="cursor-pointer transition hover:border-primary/40"
            onClick={() => openLead(lead.id)}
          >
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <p className="font-medium">{lead.name || "Sem nome"}</p>
                <p className="text-sm text-muted-foreground">
                  {lead.email || "—"} · {lead.whatsapp || "—"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {format(new Date(lead.created_at), "dd/MM/yyyy HH:mm")}
                  {lead.slot ? ` · slot ${lead.slot}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{lead.status}</Badge>
                <Badge variant={lead.qualified ? "default" : "secondary"}>
                  score {lead.score}
                  {lead.qualified ? " · qualificado" : ""}
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selected?.name || "Lead"}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p>{selected.email}</p>
                <p>{selected.whatsapp}</p>
                <p>
                  Score {selected.score} · {selected.qualified ? "Qualificado" : "Não qualificado"}
                </p>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={editStatus} onValueChange={(v) => setEditStatus(v as Lead["status"])}>
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
              <div>
                <Label>Notas</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
              </div>
              <div>
                <Label>Respostas</Label>
                <pre className="mt-1 max-h-40 overflow-auto rounded-md bg-muted p-3 text-xs">
                  {JSON.stringify(selected.answers, null, 2)}
                </pre>
              </div>
              <div>
                <Label>Eventos</Label>
                <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                  {(selected.events || []).map((ev) => (
                    <li key={ev.id}>
                      {ev.type} · {format(new Date(ev.created_at), "dd/MM HH:mm")}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={saveLead}>Salvar</Button>
                {selected.qualified && (
                  <Button variant="outline" onClick={resendWebhook}>
                    Reenviar webhook
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
