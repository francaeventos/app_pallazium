import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  deleteLeadOptionFn,
  deleteLeadQuestionFn,
  getAdminLeadFormFn,
  saveLeadOptionFn,
  saveLeadQuestionFn,
  updateLeadFormFn,
} from "@/fns/leads/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/leads/formulario")({
  component: Page,
});

type FormData = Awaited<ReturnType<typeof getAdminLeadFormFn>>["form"];

function Page() {
  const [form, setForm] = useState<FormData | null>(null);
  const [threshold, setThreshold] = useState(60);
  const [whatsapp, setWhatsapp] = useState("");
  const [agentName, setAgentName] = useState("");
  const [title, setTitle] = useState("");

  const load = async () => {
    try {
      const { form: data } = await getAdminLeadFormFn({ data: { slug: "leads" } });
      setForm(data);
      setThreshold(data.qualification_threshold);
      setWhatsapp(data.whatsapp_destination);
      setAgentName(data.agent_name);
      setTitle(data.title);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar formulário.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveFormMeta = async () => {
    if (!form) return;
    try {
      await updateLeadFormFn({
        data: {
          id: form.id,
          title,
          agent_name: agentName,
          whatsapp_destination: whatsapp,
          qualification_threshold: threshold,
        },
      });
      toast.success("Formulário salvo");
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar.");
    }
  };

  const updateOptionPoints = async (optionId: string, questionId: string, points: number, label: string) => {
    try {
      await saveLeadOptionFn({
        data: {
          id: optionId,
          question_id: questionId,
          label,
          score_points: points,
        },
      });
      toast.success("Pontos atualizados");
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar opção.");
    }
  };

  const addOption = async (questionId: string) => {
    const label = window.prompt("Texto da opção");
    if (!label) return;
    try {
      await saveLeadOptionFn({
        data: { question_id: questionId, label, score_points: 0, sort_order: 99 },
      });
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar opção.");
    }
  };

  const removeOption = async (id: string) => {
    try {
      await deleteLeadOptionFn({ data: { id } });
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao remover.");
    }
  };

  const updateQuestionBonus = async (question: FormData["questions"][number], bonus: number) => {
    try {
      await saveLeadQuestionFn({
        data: {
          id: question.id,
          form_id: form!.id,
          key: question.key,
          type: question.type,
          label: question.label,
          prompt: question.prompt,
          bot_messages: question.bot_messages,
          placeholder: question.placeholder,
          sort_order: question.sort_order,
          required: question.required,
          score_bonus: bonus,
          active: question.active,
        },
      });
      toast.success("Bônus atualizado");
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar pergunta.");
    }
  };

  const toggleQuestion = async (question: FormData["questions"][number], active: boolean) => {
    try {
      await saveLeadQuestionFn({
        data: {
          id: question.id,
          form_id: form!.id,
          key: question.key,
          type: question.type,
          label: question.label,
          prompt: question.prompt,
          bot_messages: question.bot_messages,
          placeholder: question.placeholder,
          sort_order: question.sort_order,
          required: question.required,
          score_bonus: question.score_bonus,
          active,
        },
      });
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar.");
    }
  };

  const removeQuestion = async (id: string) => {
    if (!window.confirm("Remover esta pergunta?")) return;
    try {
      await deleteLeadQuestionFn({ data: { id } });
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao remover pergunta.");
    }
  };

  if (!form) {
    return <p className="text-sm text-muted-foreground">Carregando…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/admin/leads">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="font-serif text-3xl">Formulário / score</h1>
          <p className="text-sm text-muted-foreground">Perguntas, opções e limiar de qualificação</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuração geral</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Agente</Label>
            <Input value={agentName} onChange={(e) => setAgentName(e.target.value)} />
          </div>
          <div>
            <Label>WhatsApp destino</Label>
            <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
          </div>
          <div>
            <Label>Limiar de score (qualificado ≥)</Label>
            <Input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
            />
          </div>
          <div className="sm:col-span-2">
            <Button onClick={saveFormMeta}>Salvar configuração</Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {form.questions.map((question) => (
          <Card key={question.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle className="text-lg">
                  {question.key}{" "}
                  <span className="text-sm font-normal text-muted-foreground">({question.type})</span>
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {question.prompt || question.label || "—"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <span>Ativa</span>
                  <Switch
                    checked={question.active}
                    onCheckedChange={(v) => toggleQuestion(question, v)}
                  />
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeQuestion(question.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {question.type !== "choice" && (
                <div className="max-w-xs">
                  <Label>Bônus de score</Label>
                  <Input
                    type="number"
                    defaultValue={question.score_bonus}
                    onBlur={(e) => updateQuestionBonus(question, Number(e.target.value) || 0)}
                  />
                </div>
              )}
              {question.type === "choice" && (
                <div className="space-y-2">
                  {question.options.map((opt) => (
                    <div key={opt.id} className="flex flex-wrap items-center gap-2">
                      <Input className="min-w-[200px] flex-1" value={opt.label} readOnly />
                      <Input
                        className="w-24"
                        type="number"
                        defaultValue={opt.score_points}
                        onBlur={(e) =>
                          updateOptionPoints(
                            opt.id,
                            question.id,
                            Number(e.target.value) || 0,
                            opt.label,
                          )
                        }
                      />
                      <span className="text-xs text-muted-foreground">pts</span>
                      <Button variant="ghost" size="icon" onClick={() => removeOption(opt.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => addOption(question.id)}>
                    <Plus className="h-4 w-4" /> Opção
                  </Button>
                </div>
              )}
              {question.bot_messages.length > 0 && (
                <Textarea
                  readOnly
                  value={question.bot_messages.join("\n\n")}
                  className="min-h-24 text-xs"
                />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
