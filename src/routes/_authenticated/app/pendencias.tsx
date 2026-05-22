import { createFileRoute } from "@tanstack/react-router";
import { useMyEvent } from "@/hooks/use-my-event";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Circle, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/pendencias")({ component: Page });

function Page() {
  const { data, loading } = useMyEvent();
  if (loading) return <div className="p-8 text-muted-foreground">Carregando…</div>;
  if (!data?.event) return <div className="p-8 text-muted-foreground">Nenhum evento vinculado.</div>;

  const critical = data.checklist.filter((c) => c.priority === "alta" && c.status !== "concluido");
  const important = data.checklist.filter((c) => c.priority === "media" && c.status !== "concluido");
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
            ? "Tudo organizado! 🥂"
            : `Faltam ${remaining} decisões para deixar sua festa 100% pronta.`}
        </p>
      </div>

      <Section title="Pendências críticas" icon={AlertTriangle} items={critical} tone="critical" />
      <Section title="Pendências importantes" icon={AlertCircle} items={important} tone="important" />
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

function Section({ title, icon: Icon, items, tone }: any) {
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
        {items.map((i: any) => (
          <div key={i.id} className="rounded-lg bg-card p-3 border">
            <p className="font-medium text-sm">{i.title}</p>
            {i.description && <p className="text-xs text-muted-foreground mt-1">{i.description}</p>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
