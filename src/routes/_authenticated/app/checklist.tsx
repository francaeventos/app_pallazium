import { createFileRoute } from "@tanstack/react-router";
import { useMyEvent } from "@/hooks/use-my-event";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ClientEmptyState } from "@/components/ClientEmptyState";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { Calendar, ExternalLink, ListChecks } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/app/checklist")({ component: ChecklistPage });

type ChecklistItem = Pick<
  Database["public"]["Tables"]["checklist_items"]["Row"],
  | "id"
  | "title"
  | "description"
  | "status"
  | "priority"
  | "due_date"
  | "client_notes"
  | "attachment_url"
>;
type ChecklistStatus = Database["public"]["Enums"]["checklist_status"];

function ChecklistPage() {
  const { data, loading, reload } = useMyEvent();
  if (loading) return <div className="p-8 text-muted-foreground">Carregando…</div>;
  if (!data?.event)
    return (
      <div className="p-6 lg:p-10 max-w-5xl mx-auto">
        <ClientEmptyState
          icon={Calendar}
          title="Evento em configuração"
          description="Sua conta já está ativa. Quando a equipe vincular o evento, seu checklist personalizado aparecerá aqui automaticamente."
        />
      </div>
    );

  return (
    <div className="p-6 lg:p-10 space-y-6 max-w-5xl mx-auto">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Checklist</p>
        <h1 className="font-serif text-4xl mt-2">Tudo que precisa estar pronto</h1>
      </div>
      {data.checklist.length === 0 && (
        <ClientEmptyState
          icon={ListChecks}
          title="Checklist em montagem"
          description="A equipe Pallazium está preparando os itens do seu evento. Quando o checklist for publicado, você poderá acompanhar status, prazos e observações por aqui."
        />
      )}
      <div className="space-y-3">
        {data.checklist.map((item) => (
          <ChecklistRow key={item.id} item={item} onChange={reload} />
        ))}
      </div>
    </div>
  );
}

function ChecklistRow({ item, onChange }: { item: ChecklistItem; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<ChecklistStatus>(item.status);
  const [notes, setNotes] = useState(item.client_notes ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("checklist_items")
      .update({ status, client_notes: notes })
      .eq("id", item.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Atualizado");
    onChange();
    setOpen(false);
  };

  const statusColor: Record<string, string> = {
    pendente: "bg-rose/10 text-rose border-rose/30",
    em_analise: "bg-champagne text-ink border-gold/40",
    concluido: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };

  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left p-4 hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-medium">{item.title}</p>
            {item.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{item.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className="capitalize text-xs">
              {item.priority}
            </Badge>
            <Badge variant="outline" className={`capitalize text-xs ${statusColor[item.status]}`}>
              {item.status.replace("_", " ")}
            </Badge>
          </div>
        </div>
      </button>
      {open && (
        <CardContent className="border-t pt-4 space-y-4">
          {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
          {item.due_date && <p className="text-xs text-muted-foreground">Prazo: {item.due_date}</p>}
          {item.attachment_url && (
            <a
              href={item.attachment_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium text-gold transition hover:bg-muted"
            >
              <ExternalLink className="h-4 w-4" />
              Ver anexo ou referência da equipe
            </a>
          )}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium mb-1.5 block">Status</label>
              <Select value={status} onValueChange={(value) => setStatus(value as ChecklistStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="em_analise">Em análise</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium mb-1.5 block">Suas observações</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={1000}
            />
          </div>
          <Button onClick={save} disabled={saving} size="sm">
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
