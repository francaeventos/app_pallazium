import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  deleteLeadOptionFn,
  deleteLeadQuestionFn,
  deleteLeadRuleFn,
  getAdminLeadFormFn,
  reorderLeadQuestionsFn,
  saveLeadOptionFn,
  saveLeadQuestionFn,
  saveLeadRuleFn,
  updateLeadFormFn,
} from "@/fns/leads/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ExternalLink,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { StorageImageInput } from "@/components/StorageImageInput";
import { LEAD_PRIMARY_PRESETS } from "@/lib/leads/theme";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/leads/formulario")({
  component: Page,
});

type FormData = Awaited<ReturnType<typeof getAdminLeadFormFn>>["form"];
type Question = FormData["questions"][number];
type Rule = FormData["rules"][number];
type QuestionType = Question["type"];

type QuestionDraft = {
  id?: string;
  key: string;
  type: QuestionType;
  label: string;
  prompt: string;
  bot_messages_text: string;
  placeholder: string;
  sort_order: number;
  required: boolean;
  score_bonus: number;
  active: boolean;
  options: Array<{
    id?: string;
    label: string;
    score_points: number;
    sort_order: number;
    active: boolean;
    _deleted?: boolean;
  }>;
};

type RuleDraft = {
  id?: string;
  title: string;
  body: string;
  match_key: string;
  match_value: string;
  sort_order: number;
  is_fallback: boolean;
  active: boolean;
};

function toQuestionDraft(q: Question): QuestionDraft {
  return {
    id: q.id,
    key: q.key,
    type: q.type,
    label: q.label || "",
    prompt: q.prompt || "",
    bot_messages_text: (q.bot_messages || []).join("\n\n"),
    placeholder: q.placeholder || "",
    sort_order: q.sort_order,
    required: q.required,
    score_bonus: q.score_bonus,
    active: q.active,
    options: q.options.map((o) => ({
      id: o.id,
      label: o.label,
      score_points: o.score_points,
      sort_order: o.sort_order,
      active: o.active,
    })),
  };
}

function toRuleDraft(r: Rule): RuleDraft {
  return {
    id: r.id,
    title: r.title,
    body: r.body,
    match_key: r.match_key || "",
    match_value: r.match_value || "",
    sort_order: r.sort_order,
    is_fallback: r.is_fallback,
    active: r.active,
  };
}

function parseBotMessages(text: string) {
  return text
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function Page() {
  const [form, setForm] = useState<FormData | null>(null);
  const [meta, setMeta] = useState({
    title: "",
    brand_name: "",
    agent_name: "",
    agent_title: "",
    agent_avatar_url: "",
    primary_color: "#128C7E",
    wallpaper_url: "",
    wallpaper_dark_url: "",
    header_subtitle: "",
    whatsapp_destination: "",
    whatsapp_message: "",
    qualification_threshold: 60,
    active: true,
  });
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [rules, setRules] = useState<RuleDraft[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { form: data } = await getAdminLeadFormFn({ data: { slug: "leads" } });
      setForm(data);
      setMeta({
        title: data.title,
        brand_name: data.brand_name,
        agent_name: data.agent_name,
        agent_title: data.agent_title || "",
        agent_avatar_url: data.agent_avatar_url || "",
        primary_color: data.primary_color || "#128C7E",
        wallpaper_url: data.wallpaper_url || "",
        wallpaper_dark_url: data.wallpaper_dark_url || "",
        header_subtitle: data.header_subtitle || "",
        whatsapp_destination: data.whatsapp_destination,
        whatsapp_message: data.whatsapp_message || "",
        qualification_threshold: data.qualification_threshold,
        active: data.active,
      });
      const drafts = data.questions.map(toQuestionDraft);
      setQuestions(drafts);
      setRules(data.rules.map(toRuleDraft));
      if (!expandedId && drafts[0]?.id) setExpandedId(drafts[0].id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar formulário.");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maxScoreHint = useMemo(() => {
    let max = 0;
    for (const q of questions) {
      if (!q.active) continue;
      if (q.type === "choice") {
        const best = Math.max(0, ...q.options.filter((o) => !o._deleted && o.active).map((o) => o.score_points));
        max += best;
      } else {
        max += q.score_bonus;
      }
    }
    return max;
  }, [questions]);

  const saveMeta = async () => {
    if (!form) return;
    setSaving(true);
    try {
      await updateLeadFormFn({
        data: {
          id: form.id,
          title: meta.title,
          brand_name: meta.brand_name,
          agent_name: meta.agent_name,
          agent_title: meta.agent_title || null,
          agent_avatar_url: meta.agent_avatar_url || null,
          primary_color: meta.primary_color,
          wallpaper_url: meta.wallpaper_url || null,
          wallpaper_dark_url: meta.wallpaper_dark_url || null,
          header_subtitle: meta.header_subtitle || null,
          whatsapp_destination: meta.whatsapp_destination,
          whatsapp_message: meta.whatsapp_message || null,
          qualification_threshold: meta.qualification_threshold,
          agenda_enabled: false,
          active: meta.active,
        },
      });
      toast.success("Configuração do formulário salva");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const updateQuestionLocal = (index: number, patch: Partial<QuestionDraft>) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  };

  const saveQuestion = async (index: number) => {
    if (!form) return;
    const q = questions[index];
    if (!q.key.trim()) return toast.error("Informe a chave da pergunta (ex.: investimento).");
    setSaving(true);
    try {
      await saveLeadQuestionFn({
        data: {
          id: q.id,
          form_id: form.id,
          key: q.key.trim(),
          type: q.type,
          label: q.label || null,
          prompt: q.prompt || null,
          bot_messages: parseBotMessages(q.bot_messages_text),
          placeholder: q.placeholder || null,
          sort_order: index,
          required: q.required,
          score_bonus: q.score_bonus,
          active: q.active,
        },
      });

      // reload to get id if new, then save options
      const { form: refreshed } = await getAdminLeadFormFn({ data: { slug: "leads" } });
      const saved = refreshed.questions.find((x) => x.key === q.key.trim());
      if (!saved) throw new Error("Pergunta salva, mas não encontrada.");

      for (const opt of q.options) {
        if (opt._deleted && opt.id) {
          await deleteLeadOptionFn({ data: { id: opt.id } });
          continue;
        }
        if (opt._deleted) continue;
        if (!opt.label.trim()) continue;
        await saveLeadOptionFn({
          data: {
            id: opt.id,
            question_id: saved.id,
            label: opt.label.trim(),
            score_points: Number(opt.score_points) || 0,
            sort_order: opt.sort_order,
            active: opt.active,
          },
        });
      }

      toast.success(`Pergunta “${q.key}” salva`);
      await load();
      setExpandedId(saved.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar pergunta.");
    } finally {
      setSaving(false);
    }
  };

  const addQuestion = () => {
    const key = `pergunta_${Date.now().toString().slice(-4)}`;
    const draft: QuestionDraft = {
      key,
      type: "choice",
      label: "",
      prompt: "Nova pergunta",
      bot_messages_text: "",
      placeholder: "",
      sort_order: questions.length,
      required: true,
      score_bonus: 0,
      active: true,
      options: [
        { label: "Opção A", score_points: 10, sort_order: 0, active: true },
        { label: "Opção B", score_points: 20, sort_order: 1, active: true },
      ],
    };
    setQuestions((prev) => [...prev, draft]);
    setExpandedId(key);
  };

  const removeQuestion = async (index: number) => {
    const q = questions[index];
    if (!window.confirm(`Remover a pergunta “${q.key}”?`)) return;
    if (!q.id) {
      setQuestions((prev) => prev.filter((_, i) => i !== index));
      return;
    }
    try {
      await deleteLeadQuestionFn({ data: { id: q.id } });
      toast.success("Pergunta removida");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao remover.");
    }
  };

  const moveQuestion = async (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= questions.length) return;
    const ordered = [...questions];
    const tmp = ordered[index];
    ordered[index] = ordered[next];
    ordered[next] = tmp;
    setQuestions(ordered);

    if (!form) return;
    const ids = ordered.map((q) => q.id).filter(Boolean) as string[];
    if (ids.length !== ordered.length) {
      toast.message("Salve as perguntas novas antes de reordenar no banco.");
      return;
    }
    try {
      await reorderLeadQuestionsFn({ data: { form_id: form.id, ordered_ids: ids } });
      toast.success("Ordem atualizada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao reordenar.");
      load();
    }
  };

  const saveRule = async (index: number) => {
    if (!form) return;
    const r = rules[index];
    setSaving(true);
    try {
      await saveLeadRuleFn({
        data: {
          id: r.id,
          form_id: form.id,
          title: r.title,
          body: r.body,
          match_key: r.match_key || null,
          match_value: r.match_value || null,
          sort_order: index,
          is_fallback: r.is_fallback,
          active: r.active,
        },
      });
      toast.success("Regra de diagnóstico salva");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar regra.");
    } finally {
      setSaving(false);
    }
  };

  const addRule = () => {
    setRules((prev) => [
      ...prev,
      {
        title: "Novo diagnóstico",
        body: "Texto do diagnóstico…",
        match_key: "tipoEvento",
        match_value: "",
        sort_order: prev.length,
        is_fallback: false,
        active: true,
      },
    ]);
  };

  const removeRule = async (index: number) => {
    const r = rules[index];
    if (!window.confirm("Remover esta regra?")) return;
    if (!r.id) {
      setRules((prev) => prev.filter((_, i) => i !== index));
      return;
    }
    try {
      await deleteLeadRuleFn({ data: { id: r.id } });
      toast.success("Regra removida");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao remover regra.");
    }
  };

  if (!form) {
    return <p className="text-sm text-muted-foreground">Carregando editor…</p>;
  }

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin/leads">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="font-serif text-3xl">Editor do formulário</h1>
            <p className="text-sm text-muted-foreground">
              Edite perguntas, opções, score e textos do chat · score máximo possível ≈ {maxScoreHint} · limiar{" "}
              {meta.qualification_threshold}
            </p>
          </div>
        </div>
        <Button variant="outline" asChild>
          <a href="/leads" target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4" /> Abrir /leads
          </a>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Visual do chat (cores e avatar)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-3">
            <Label>Cor primária (header, botões, opções)</Label>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="color"
                value={meta.primary_color}
                onChange={(e) => setMeta({ ...meta, primary_color: e.target.value })}
                className="h-11 w-14 cursor-pointer rounded border bg-transparent p-1"
              />
              <Input
                className="max-w-[140px] font-mono uppercase"
                value={meta.primary_color}
                onChange={(e) => setMeta({ ...meta, primary_color: e.target.value })}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {LEAD_PRIMARY_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  title={color}
                  onClick={() => setMeta({ ...meta, primary_color: color })}
                  className="h-8 w-8 rounded-full border-2 border-white shadow ring-1 ring-black/10"
                  style={{ background: color }}
                />
              ))}
            </div>
            <div
              className="rounded-xl p-4 text-white shadow"
              style={{
                background: `linear-gradient(180deg, ${meta.primary_color} 0%, color-mix(in srgb, ${meta.primary_color} 72%, black) 100%)`,
              }}
            >
              <p className="text-sm font-semibold">{meta.agent_name || "Agente"}</p>
              <p className="text-xs opacity-70">
                {meta.header_subtitle || meta.agent_title || "diagnóstico online"}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <StorageImageInput
              bucket="leads"
              folder="avatars"
              name="agent_avatar"
              label="Foto do avatar do agente"
              defaultValue={meta.agent_avatar_url}
              onValueChange={(url) => setMeta({ ...meta, agent_avatar_url: url })}
            />
            <StorageImageInput
              bucket="leads"
              folder="wallpapers"
              name="wallpaper_light"
              label="Fundo do chat — modo claro"
              defaultValue={meta.wallpaper_url}
              onValueChange={(url) => setMeta({ ...meta, wallpaper_url: url })}
            />
            <StorageImageInput
              bucket="leads"
              folder="wallpapers"
              name="wallpaper_dark"
              label="Fundo do chat — modo escuro"
              defaultValue={meta.wallpaper_dark_url}
              onValueChange={(url) => setMeta({ ...meta, wallpaper_dark_url: url })}
            />
            <p className="text-xs text-muted-foreground">
              O app escolhe claro/escuro automaticamente pelo tema do celular do visitante (
              <code>prefers-color-scheme</code>).
            </p>
          </div>

          <Field label="Subtítulo do header">
            <Input
              value={meta.header_subtitle}
              placeholder="diagnóstico online"
              onChange={(e) => setMeta({ ...meta, header_subtitle: e.target.value })}
            />
          </Field>
          <Field label="Cargo do agente (fallback do subtítulo)">
            <Input
              value={meta.agent_title}
              onChange={(e) => setMeta({ ...meta, agent_title: e.target.value })}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Identidade, WhatsApp e qualificação</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Título interno">
            <Input value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} />
          </Field>
          <Field label="Marca">
            <Input
              value={meta.brand_name}
              onChange={(e) => setMeta({ ...meta, brand_name: e.target.value })}
            />
          </Field>
          <Field label="Nome do agente">
            <Input
              value={meta.agent_name}
              onChange={(e) => setMeta({ ...meta, agent_name: e.target.value })}
            />
          </Field>
          <Field label="WhatsApp destino (só números com DDI)">
            <Input
              value={meta.whatsapp_destination}
              onChange={(e) => setMeta({ ...meta, whatsapp_destination: e.target.value })}
            />
          </Field>
          <Field label="Mensagem padrão WhatsApp">
            <Input
              value={meta.whatsapp_message}
              onChange={(e) => setMeta({ ...meta, whatsapp_message: e.target.value })}
            />
          </Field>
          <Field label="Limiar de score (qualificado se score ≥)">
            <Input
              type="number"
              value={meta.qualification_threshold}
              onChange={(e) =>
                setMeta({ ...meta, qualification_threshold: Number(e.target.value) || 0 })
              }
            />
          </Field>
          <div className="flex items-center gap-6 pt-6 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={meta.active} onCheckedChange={(v) => setMeta({ ...meta, active: v })} />
              Formulário ativo
            </label>
          </div>
          <div className="sm:col-span-2">
            <Button onClick={saveMeta} disabled={saving}>
              <Save className="h-4 w-4" /> Salvar visual e configuração
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <h2 className="font-serif text-2xl">Perguntas do quiz</h2>
        <Button onClick={addQuestion}>
          <Plus className="h-4 w-4" /> Nova pergunta
        </Button>
      </div>

      <div className="space-y-3">
        {questions.map((q, index) => {
          const panelId = q.id || q.key;
          const open = expandedId === panelId;
          return (
            <Card key={panelId} className={!q.active ? "opacity-60" : undefined}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left"
                onClick={() => setExpandedId(open ? null : panelId)}
              >
                <div>
                  <p className="font-medium">
                    {index + 1}. {q.prompt || q.label || q.key}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      [{q.key} · {q.type}]
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {q.type === "choice"
                      ? `${q.options.filter((o) => !o._deleted).length} opções · score até ${Math.max(0, ...q.options.filter((o) => !o._deleted).map((o) => o.score_points))}`
                      : `bônus ${q.score_bonus} pts`}
                  </p>
                </div>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" onClick={() => moveQuestion(index, -1)}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => moveQuestion(index, 1)}>
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>
              </button>

              {open && (
                <CardContent className="space-y-4 border-t pt-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Chave (interna, sem espaços)">
                      <Input
                        value={q.key}
                        onChange={(e) =>
                          updateQuestionLocal(index, {
                            key: e.target.value.replace(/\s+/g, ""),
                          })
                        }
                      />
                    </Field>
                    <Field label="Tipo de resposta">
                      <Select
                        value={q.type}
                        onValueChange={(v) => updateQuestionLocal(index, { type: v as QuestionType })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Texto</SelectItem>
                          <SelectItem value="email">E-mail</SelectItem>
                          <SelectItem value="tel">WhatsApp / telefone</SelectItem>
                          <SelectItem value="choice">Múltipla escolha</SelectItem>
                          <SelectItem value="date">Data</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Label do campo (ex.: NOME COMPLETO)">
                      <Input
                        value={q.label}
                        onChange={(e) => updateQuestionLocal(index, { label: e.target.value })}
                      />
                    </Field>
                    <Field label="Placeholder">
                      <Input
                        value={q.placeholder}
                        onChange={(e) => updateQuestionLocal(index, { placeholder: e.target.value })}
                      />
                    </Field>
                    <div className="sm:col-span-2">
                      <Field label="Pergunta exibida no chat (prompt)">
                        <Textarea
                          value={q.prompt}
                          rows={2}
                          onChange={(e) => updateQuestionLocal(index, { prompt: e.target.value })}
                        />
                      </Field>
                    </div>
                    <div className="sm:col-span-2">
                      <Field label="Mensagens do bot antes da pergunta (separe blocos com linha em branco; use {nome})">
                        <Textarea
                          value={q.bot_messages_text}
                          rows={6}
                          className="font-mono text-xs"
                          onChange={(e) =>
                            updateQuestionLocal(index, { bot_messages_text: e.target.value })
                          }
                        />
                      </Field>
                    </div>
                    {q.type !== "choice" && (
                      <Field label="Bônus de score ao responder">
                        <Input
                          type="number"
                          value={q.score_bonus}
                          onChange={(e) =>
                            updateQuestionLocal(index, {
                              score_bonus: Number(e.target.value) || 0,
                            })
                          }
                        />
                      </Field>
                    )}
                    <div className="flex flex-wrap items-center gap-6 pt-6">
                      <label className="flex items-center gap-2 text-sm">
                        <Switch
                          checked={q.required}
                          onCheckedChange={(v) => updateQuestionLocal(index, { required: v })}
                        />
                        Obrigatória
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <Switch
                          checked={q.active}
                          onCheckedChange={(v) => updateQuestionLocal(index, { active: v })}
                        />
                        Ativa
                      </label>
                    </div>
                  </div>

                  {q.type === "choice" && (
                    <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Opções e pontuação</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            updateQuestionLocal(index, {
                              options: [
                                ...q.options,
                                {
                                  label: "Nova opção",
                                  score_points: 0,
                                  sort_order: q.options.length,
                                  active: true,
                                },
                              ],
                            })
                          }
                        >
                          <Plus className="h-4 w-4" /> Opção
                        </Button>
                      </div>
                      <div className="grid gap-2">
                        <div className="hidden grid-cols-[1fr_100px_40px] gap-2 text-xs text-muted-foreground sm:grid">
                          <span>Texto da opção</span>
                          <span>Score</span>
                          <span />
                        </div>
                        {q.options.map((opt, oi) => {
                          if (opt._deleted) return null;
                          return (
                            <div key={opt.id || `new-${oi}`} className="grid grid-cols-[1fr_100px_40px] gap-2">
                              <Input
                                value={opt.label}
                                onChange={(e) => {
                                  const options = q.options.map((o, i) =>
                                    i === oi ? { ...o, label: e.target.value } : o,
                                  );
                                  updateQuestionLocal(index, { options });
                                }}
                              />
                              <Input
                                type="number"
                                value={opt.score_points}
                                onChange={(e) => {
                                  const options = q.options.map((o, i) =>
                                    i === oi
                                      ? { ...o, score_points: Number(e.target.value) || 0 }
                                      : o,
                                  );
                                  updateQuestionLocal(index, { options });
                                }}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  const options = q.options.map((o, i) =>
                                    i === oi ? { ...o, _deleted: true } : o,
                                  );
                                  updateQuestionLocal(index, { options });
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => saveQuestion(index)} disabled={saving}>
                      <Save className="h-4 w-4" /> Salvar pergunta
                    </Button>
                    <Button variant="destructive" onClick={() => removeQuestion(index)}>
                      <Trash2 className="h-4 w-4" /> Remover
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 pt-4">
        <h2 className="font-serif text-2xl">Diagnóstico (após o quiz)</h2>
        <Button variant="outline" onClick={addRule}>
          <Plus className="h-4 w-4" /> Nova regra
        </Button>
      </div>

      <div className="space-y-3">
        {rules.map((r, index) => (
          <Card key={r.id || `rule-${index}`}>
            <CardContent className="grid gap-3 pt-6 sm:grid-cols-2">
              <Field label="Título">
                <Input
                  value={r.title}
                  onChange={(e) =>
                    setRules((prev) =>
                      prev.map((x, i) => (i === index ? { ...x, title: e.target.value } : x)),
                    )
                  }
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Match key (ex.: tipoEvento)">
                  <Input
                    value={r.match_key}
                    disabled={r.is_fallback}
                    onChange={(e) =>
                      setRules((prev) =>
                        prev.map((x, i) => (i === index ? { ...x, match_key: e.target.value } : x)),
                      )
                    }
                  />
                </Field>
                <Field label="Match value">
                  <Input
                    value={r.match_value}
                    disabled={r.is_fallback}
                    onChange={(e) =>
                      setRules((prev) =>
                        prev.map((x, i) =>
                          i === index ? { ...x, match_value: e.target.value } : x,
                        ),
                      )
                    }
                  />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Texto">
                  <Textarea
                    rows={3}
                    value={r.body}
                    onChange={(e) =>
                      setRules((prev) =>
                        prev.map((x, i) => (i === index ? { ...x, body: e.target.value } : x)),
                      )
                    }
                  />
                </Field>
              </div>
              <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={r.is_fallback}
                    onCheckedChange={(v) =>
                      setRules((prev) =>
                        prev.map((x, i) => (i === index ? { ...x, is_fallback: v } : x)),
                      )
                    }
                  />
                  Fallback
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={r.active}
                    onCheckedChange={(v) =>
                      setRules((prev) =>
                        prev.map((x, i) => (i === index ? { ...x, active: v } : x)),
                      )
                    }
                  />
                  Ativa
                </label>
                <Button size="sm" onClick={() => saveRule(index)} disabled={saving}>
                  Salvar regra
                </Button>
                <Button size="sm" variant="ghost" onClick={() => removeRule(index)}>
                  Remover
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
