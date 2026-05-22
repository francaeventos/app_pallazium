import { createFileRoute, Link } from "@tanstack/react-router";
import { useMyEvent } from "@/hooks/use-my-event";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClientEmptyState } from "@/components/ClientEmptyState";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Circle,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/app/pendencias")({ component: Page });

function Page() {
  const { data, loading } = useMyEvent();
  if (loading) return <div className="p-8 text-muted-foreground">Carregando…</div>;
  if (!data?.event)
    return (
      <div className="p-6 lg:p-10 max-w-5xl mx-auto">
        <ClientEmptyState
          icon={Calendar}
          title="Evento em configuração"
          description="Assim que seu evento for vinculado à conta, esta página mostrará as decisões pendentes, prioridades e recomendações da equipe."
        />
      </div>
    );

  const critical = data.checklist.filter((c) => c.priority === "alta" && c.status !== "concluido");
  const important = data.checklist.filter(
    (c) => c.priority === "media" && c.status !== "concluido",
  );
  const optional = data.checklist.filter((c) => c.priority === "baixa" && c.status !== "concluido");
  const done = data.checklist.filter((c) => c.status === "concluido");
  const remaining = critical.length + important.length + optional.length;

  return (
    <div className="p-6 lg:p-10 space-y-6 max-w-5xl mx-auto">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Diagnóstico</p>
        <h1 className="font-serif text-4xl mt-2">Status do seu evento</h1>
        <p className="text-muted-foreground mt-2">
          {remaining === 0
            ? "Tudo organizado para o seu evento."
            : `Faltam ${remaining} decisões para deixar sua festa 100% pronta.`}
        </p>
      </div>

      <Card className="border-gold/30 bg-champagne/30">
        <CardContent className="p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-serif text-xl">Recomendação da equipe</p>
            <p className="text-sm text-muted-foreground mt-1">
              {getGeneralRecommendation(critical.length, important.length)}
            </p>
          </div>
          <Button asChild size="sm">
            <Link to="/app/checklist">Abrir checklist</Link>
          </Button>
        </CardContent>
      </Card>

      <Section title="Pendências críticas" icon={AlertTriangle} items={critical} tone="critical" />
      <Section
        title="Pendências importantes"
        icon={AlertCircle}
        items={important}
        tone="important"
      />
      <Section title="Itens opcionais" icon={Circle} items={optional} tone="optional" />
      <Section title="Itens concluídos" icon={CheckCircle2} items={done} tone="done" />
    </div>
  );
}

const tones: Record<string, string> = {
  critical: "border-rose/40 bg-rose/5",
  important: "border-gold/40 bg-champagne/30",
  optional: "border-border bg-muted/30",
  done: "border-emerald-200 bg-emerald-50",
};

type ChecklistItem = Pick<
  Database["public"]["Tables"]["checklist_items"]["Row"],
  "id" | "title" | "description" | "status" | "priority" | "due_date"
>;

function Section({
  title,
  icon: Icon,
  items,
  tone,
}: {
  title: string;
  icon: LucideIcon;
  items: ChecklistItem[];
  tone: keyof typeof tones;
}) {
  if (items.length === 0) return null;
  return (
    <Card className={tones[tone]}>
      <CardHeader>
        <CardTitle className="font-serif text-xl flex items-center gap-2">
          <Icon className="h-5 w-5" /> {title}
          <span className="text-sm font-sans text-muted-foreground ml-auto">{items.length}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((i) => (
          <div key={i.id} className="rounded-lg bg-card p-3 border">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-sm">{i.title}</p>
                {i.description && (
                  <p className="text-xs text-muted-foreground mt-1">{i.description}</p>
                )}
                {i.due_date && (
                  <p className="text-xs text-muted-foreground mt-1">Prazo: {i.due_date}</p>
                )}
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/app/checklist">Atualizar</Link>
              </Button>
            </div>
            <p className="mt-3 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              {recommendationFor(i)}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function getGeneralRecommendation(critical: number, important: number) {
  if (critical > 0) {
    return "Priorize as pendências críticas para evitar impacto direto no cronograma e na operação do evento.";
  }
  if (important > 0) {
    return "As decisões principais estão encaminhadas. Agora vale avançar nas pendências importantes para reduzir retrabalho.";
  }
  return "Seu checklist está em bom ritmo. Revise os itens opcionais e mantenha as informações atualizadas.";
}

function recommendationFor(item: ChecklistItem) {
  if (item.priority === "alta") {
    return "Ação recomendada: envie a decisão ou observação o quanto antes para a equipe validar os próximos passos.";
  }
  if (item.priority === "media") {
    return "Ação recomendada: confirme este ponto nos próximos dias para manter o planejamento fluindo.";
  }
  if (item.status === "concluido") {
    return "Item concluído. Se algo mudar, atualize o checklist para a equipe acompanhar.";
  }
  return "Ação recomendada: registre sua preferência quando tiver a definição.";
}
