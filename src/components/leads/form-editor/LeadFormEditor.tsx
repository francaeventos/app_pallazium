import {
  Link,
  useRouterState,
} from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  testLeadWebhookFn,
  testMetaCapiFn,
} from "@/fns/leads/admin";
import { AdminEmptyState } from "@/components/AdminEmptyState";
import {
  Field,
  parseBotMessages,
  useLeadFormEditor,
  type QuestionDraft,
  type QuestionType,
} from "@/components/leads/form-editor/editor-context";
import { MessageFormatBar } from "@/components/leads/form-editor/MessageFormatToolbar";
import { LeadMediaUploadInput } from "@/components/leads/form-editor/LeadMediaUploadInput";
import { LeadMediaView, resolveQuestionMedia } from "@/components/leads/LeadMediaView";
import { parseMediaKind, type MediaKind } from "@/lib/leads/media";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { temperatureLabel, type ConversionMinTemperature } from "@/lib/leads/score";
import {
  BLOCK_MENU,
  CLOSE_WINDOW,
  FLOW_END,
  NO_REDIRECT,
  TYPE_LABEL,
  defaultOptionsForType,
  hasChoiceOptions,
  isContentOnlyType,
  resolveNextStepIndex,
} from "@/lib/leads/question-types";
import { CORE_VARIABLE_CHIPS, buildFlowVariableChips, buildLeadTemplateVars, defaultWhatsAppRedirectTemplate, formatLeadMessageHtml, interpolateLeadTemplate, resolveRedirectUrl } from "@/lib/leads/variables";
import { formatDateMaskBr } from "@/lib/leads/date";
import { VariableChips } from "@/components/leads/form-editor/VariableChips";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ExternalLink,
  FlaskConical,
  Gauge,
  MessageSquareText,
  Palette,
  Plus,
  RotateCcw,
  Save,
  Send,
  Stethoscope,
  Trash2,
  Wand2,
  Webhook,
} from "lucide-react";
import { toast } from "sonner";

const NAV_ITEMS = [
  { to: "/admin/leads/formulario/score", label: "Score", icon: Gauge },
  { to: "/admin/leads/formulario/visual", label: "Visual", icon: Palette },
  { to: "/admin/leads/formulario/simulador", label: "Simulador", icon: Wand2 },
  { to: "/admin/leads/formulario/pixels", label: "Pixels", icon: Webhook },
  { to: "/admin/leads/formulario/diagnostico", label: "Resumo", icon: Stethoscope },
] as const;

const navPillClass =
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:text-foreground";
const navPillActiveClass = "bg-background text-foreground shadow-sm";

function NextKeySelect({
  value,
  onChange,
  questionKeys,
  currentKey,
}: {
  value: string;
  onChange: (v: string) => void;
  questionKeys: string[];
  currentKey?: string;
}) {
  return (
    <Select value={value || "__default__"} onValueChange={(v) => onChange(v === "__default__" ? "" : v)}>
      <SelectTrigger>
        <SelectValue placeholder="Seguir fluxo padrão" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__default__">Seguir fluxo padrão</SelectItem>
        <SelectItem value={FLOW_END}>Encerrar → resumo</SelectItem>
        {questionKeys
          .filter((k) => k && k !== currentKey)
          .map((k) => (
            <SelectItem key={k} value={k}>
              Ir para: {k}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}


export function LeadFormEditorChrome({ children }: { children: ReactNode }) {
  const {
    meta,
    maxScoreHint,
    activeQuestions,
    activeRules,
    savingMeta,
    saveMeta,
    savingIntegrations,
    saveIntegrations,
  } = useLeadFormEditor();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isMetaRoute = pathname.endsWith("/score") || pathname.endsWith("/visual");
  const isPixelsRoute = pathname.endsWith("/pixels");
  const isSimulator = pathname.endsWith("/simulador");

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 pb-24 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" className="mt-1 shrink-0" asChild>
            <Link to="/admin/leads">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold">
              Captação · Editor
            </p>
            <h1 className="font-serif text-3xl tracking-tight lg:text-4xl">Formulário de leads</h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Visual do chat, perguntas, pontuação e resumos — o que o visitante vê em{" "}
              <span className="font-medium text-foreground">/leads</span>.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant={meta.active ? "default" : "secondary"}>
                {meta.active ? "Formulário ativo" : "Inativo"}
              </Badge>
              <Badge variant="outline">
                Até {maxScoreHint} pts · qualifica com {meta.score_warm_max + 1}+
              </Badge>
              <Badge variant="outline">
                {activeQuestions} pergunta{activeQuestions === 1 ? "" : "s"} ativa
                {activeQuestions === 1 ? "" : "s"}
              </Badge>
              <Badge variant="outline">
                {activeRules} resumo{activeRules === 1 ? "" : "s"}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <a href="/leads" target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" /> Abrir /leads
            </a>
          </Button>
          {isMetaRoute && (
            <Button onClick={saveMeta} disabled={savingMeta}>
              <Save className="h-4 w-4" />
              {savingMeta ? "Salvando…" : "Salvar"}
            </Button>
          )}
          {isPixelsRoute && (
            <Button onClick={saveIntegrations} disabled={savingIntegrations}>
              <Save className="h-4 w-4" />
              {savingIntegrations ? "Salvando…" : "Salvar integrações"}
            </Button>
          )}
        </div>
      </div>

      <div
        className={cn(
          "grid gap-5",
          isSimulator
            ? "lg:grid-cols-[minmax(0,1fr)_minmax(360px,440px)]"
            : "lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]",
        )}
      >
        <LeadFormFlowColumn compact={isSimulator} />

        <aside className="min-w-0 space-y-3 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:self-start lg:overflow-y-auto">
          <nav className="flex flex-wrap gap-1 rounded-xl border bg-muted/40 p-1.5">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={navPillClass}
                activeProps={{ className: cn(navPillClass, navPillActiveClass) }}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            ))}
          </nav>

          {children}
        </aside>
      </div>
    </div>
  );
}

function AddBlockMenu({
  onAdd,
  label = "Adicionar bloco",
  size = "default",
  variant = "default",
  align = "end",
  className,
}: {
  onAdd: (type: QuestionType) => void;
  label?: string;
  size?: "default" | "sm";
  variant?: "default" | "outline" | "ghost" | "secondary";
  align?: "start" | "center" | "end";
  className?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size={size} variant={variant} className={className}>
          <Plus className="h-4 w-4" /> {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="max-h-[70vh] w-56 overflow-y-auto">
        {BLOCK_MENU.map((section, si) => (
          <div key={section.section}>
            {si > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {section.section}
            </DropdownMenuLabel>
            {section.items.map((item) => (
              <DropdownMenuItem
                key={item.type}
                onClick={() => onAdd(item.type)}
                className="flex flex-col items-start gap-0.5"
              >
                <span>{item.label}</span>
                {item.hint ? (
                  <span className="text-[11px] text-muted-foreground">{item.hint}</span>
                ) : null}
              </DropdownMenuItem>
            ))}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function LeadFormFlowColumn({ compact = false }: { compact?: boolean }) {
  const {
    meta,
    setMeta,
    savingMeta,
    saveMeta,
    questions,
    questionKeys,
    expandedId,
    setExpandedId,
    savingQuestionId,
    updateQuestionLocal,
    saveQuestion,
    addQuestion,
    removeQuestion,
    moveQuestion,
  } = useLeadFormEditor();

  const flowChips = buildFlowVariableChips(questionKeys);

  return (
    <div className={cn("space-y-5", compact && "min-w-0")}>
      {!compact && (
      <Card className="border-gold/15 shadow-soft">
        <CardHeader>
          <CardTitle className="font-serif text-2xl">Identidade do chat</CardTitle>
          <CardDescription>
            Nome, marca, subtítulo e status — o cabeçalho que o lead vê ao abrir o quiz.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome do agente">
            <Input
              value={meta.agent_name}
              onChange={(e) => setMeta({ ...meta, agent_name: e.target.value })}
            />
          </Field>
          <Field label="Marca">
            <Input
              value={meta.brand_name}
              onChange={(e) => setMeta({ ...meta, brand_name: e.target.value })}
            />
          </Field>
          <Field label="Subtítulo do header">
            <Input
              value={meta.header_subtitle}
              placeholder="Estou online"
              onChange={(e) => setMeta({ ...meta, header_subtitle: e.target.value })}
            />
          </Field>
          <Field label="Cargo (fallback do subtítulo)">
            <Input
              value={meta.agent_title}
              onChange={(e) => setMeta({ ...meta, agent_title: e.target.value })}
            />
          </Field>
          <Field label="Título interno (admin)">
            <Input value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} />
          </Field>
          <div className="flex items-end justify-between gap-3 pb-1 sm:col-span-1">
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={meta.active}
                onCheckedChange={(v) => setMeta({ ...meta, active: v })}
              />
              Formulário ativo no site
            </label>
          </div>
          <div className="sm:col-span-2">
            <Button size="sm" onClick={saveMeta} disabled={savingMeta}>
              <Save className="h-4 w-4" />
              {savingMeta ? "Salvando…" : "Salvar identidade"}
            </Button>
          </div>
        </CardContent>
      </Card>
      )}

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className={cn("font-serif", compact ? "text-xl" : "text-2xl")}>Fluxo do quiz</h2>
            {!compact && (
            <p className="text-sm text-muted-foreground">
              Ordem = sequência no chat. Separe mensagens do bot com linha em branco; use os
              chips de variável para inserir <code className="rounded bg-muted px-1">{"{{nome}}"}</code>.
            </p>
            )}
          </div>
          <AddBlockMenu
            size={compact ? "sm" : "default"}
            label={compact ? "Bloco" : "Adicionar bloco"}
            onAdd={(type) => addQuestion(type)}
          />
        </div>

        {questions.length === 0 ? (
          <AdminEmptyState
            icon={MessageSquareText}
            title="Nenhum bloco ainda"
            description="Crie o primeiro bloco do quiz. Use o menu para escolher o tipo (mensagem, campo ou escolha)."
            actionLabel="Adicionar botões"
            onAction={() => addQuestion("buttons")}
          />
        ) : (
          <div className="space-y-1">
            {questions.map((q, index) => {
              const panelId = q.localId;
              const open = expandedId === panelId;
              const choiceMax = Math.max(
                0,
                ...q.options.filter((o) => !o._deleted).map((o) => o.score_points),
              );
              return (
                <div key={panelId} className="space-y-1">
                <Card
                  className={`border-gold/10 transition hover:border-primary/30 ${
                    !q.active ? "opacity-60" : ""
                  } ${open ? "border-primary/40 shadow-soft" : ""}`}
                >
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                    onClick={() => setExpandedId(open ? null : panelId)}
                  >
                    <div className="min-w-0 space-y-1.5">
                      <p className="truncate font-medium">
                        <span className="mr-2 text-muted-foreground">{index + 1}.</span>
                        {q.prompt || q.label || q.key}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {`{{${q.key}}}`}
                        </Badge>
                        <Badge variant="secondary">{TYPE_LABEL[q.type] || q.type}</Badge>
                        {q.required && q.type !== "redirect" && (
                          <Badge variant="outline">Obrigatória</Badge>
                        )}
                        {!q.active && <Badge variant="secondary">Inativa</Badge>}
                        <Badge variant="outline">
                          {hasChoiceOptions(q.type)
                            ? `${q.options.filter((o) => !o._deleted).length} opc. · até ${choiceMax} pts`
                            : `+${q.score_bonus} pts`}
                        </Badge>
                      </div>
                    </div>
                    <div
                      className="flex shrink-0 items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
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
                      {q.type === "redirect" ? (
                        <div className="space-y-4">
                          <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
                            <Field label="Título">
                              <Input
                                value={q.prompt}
                                placeholder="✅ Obrigado pelas informações!"
                                onChange={(e) =>
                                  updateQuestionLocal(index, { prompt: e.target.value })
                                }
                              />
                              <VariableChips
                                tokens={flowChips}
                                onInsert={(token) =>
                                  updateQuestionLocal(index, {
                                    prompt: q.prompt ? `${q.prompt} ${token}` : token,
                                  })
                                }
                              />
                            </Field>
                            <Field label="Pontos (+/-)">
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
                          </div>

                          <Field
                            label="Descrição"
                            hint="Mensagens do bot antes do redirecionamento (blocos separados por linha em branco)."
                          >
                            <Textarea
                              value={q.bot_messages_text}
                              rows={4}
                              className="font-mono text-xs"
                              placeholder="Em breve te chamamos no WhatsApp…"
                              onChange={(e) =>
                                updateQuestionLocal(index, {
                                  bot_messages_text: e.target.value,
                                })
                              }
                            />
                            <MessageFormatBar
                              value={q.bot_messages_text}
                              onChange={(bot_messages_text) =>
                                updateQuestionLocal(index, { bot_messages_text })
                              }
                              tokens={flowChips}
                            />
                          </Field>

                          <Field label="Tipo de encerramento">
                            <Select
                              value={
                                q.placeholder === NO_REDIRECT
                                  ? "none"
                                  : q.placeholder === CLOSE_WINDOW
                                    ? "close"
                                    : "url"
                              }
                              onValueChange={(v) =>
                                updateQuestionLocal(index, {
                                  placeholder:
                                    v === "none" ? NO_REDIRECT : v === "close" ? CLOSE_WINDOW : "",
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="url">Abrir link (WhatsApp ou outro)</SelectItem>
                                <SelectItem value="none">Sem botão (só mensagem)</SelectItem>
                                <SelectItem value="close">Botão para fechar janela</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Use "Sem botão" ou "Fechar janela" para fluxos que não devem cair no
                              WhatsApp comercial (ex.: parcerias, trabalhe conosco).
                            </p>
                          </Field>

                          {q.placeholder !== NO_REDIRECT && q.placeholder !== CLOSE_WINDOW ? (
                            <Field label="URL de redirecionamento">
                              <VariableChips
                                tokens={flowChips}
                                onInsert={(token) =>
                                  updateQuestionLocal(index, {
                                    placeholder: q.placeholder
                                      ? `${q.placeholder}${token}`
                                      : token,
                                  })
                                }
                              />
                              <Textarea
                                value={q.placeholder}
                                rows={4}
                                className="mt-2 font-mono text-xs"
                                placeholder="https://wa.me/55...?text=Olá, eu sou {{nome}}... (vazio = WhatsApp padrão do formulário)"
                                onChange={(e) =>
                                  updateQuestionLocal(index, { placeholder: e.target.value })
                                }
                              />
                            </Field>
                          ) : null}

                          <div className="space-y-2 rounded-xl border bg-muted/30 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-medium">Modelo pronto (selecionável)</p>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  updateQuestionLocal(index, {
                                    placeholder: defaultWhatsAppRedirectTemplate(
                                      meta.whatsapp_destination,
                                    ),
                                  })
                                }
                              >
                                Usar / copiar modelo
                              </Button>
                            </div>
                            <p className="break-all font-mono text-[11px] text-muted-foreground">
                              {defaultWhatsAppRedirectTemplate(meta.whatsapp_destination)}
                            </p>
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <Field
                              label="Atraso do redirecionamento (segundos)"
                              hint="0 = imediato. Ex.: 3 = mostra a mensagem e só depois abre o link."
                            >
                              <Input
                                type="number"
                                min={0}
                                max={120}
                                disabled={
                                  q.placeholder === NO_REDIRECT ||
                                  q.placeholder === CLOSE_WINDOW ||
                                  q.redirect_delay_sec < 0
                                }
                                value={q.redirect_delay_sec < 0 ? "" : q.redirect_delay_sec}
                                onChange={(e) =>
                                  updateQuestionLocal(index, {
                                    redirect_delay_sec: Math.max(
                                      0,
                                      Math.min(120, Number(e.target.value) || 0),
                                    ),
                                  })
                                }
                              />
                            </Field>
                            <Field
                              label="Texto do botão"
                              hint='Vazio = "Falar no WhatsApp" (wa.me), "Fechar janela" (fechar) ou "Continuar" (outro link).'
                            >
                              <Input
                                disabled={q.placeholder === NO_REDIRECT}
                                value={q.redirect_button_label}
                                placeholder="Ex.: ACESSAR TRABALHE CONOSCO"
                                onChange={(e) =>
                                  updateQuestionLocal(index, {
                                    redirect_button_label: e.target.value,
                                  })
                                }
                              />
                            </Field>
                          </div>

                          {q.placeholder !== NO_REDIRECT && q.placeholder !== CLOSE_WINDOW ? (
                            <label className="flex items-center gap-2 rounded-xl border bg-muted/30 p-3 text-sm">
                              <Switch
                                checked={q.redirect_delay_sec < 0}
                                onCheckedChange={(checked) =>
                                  updateQuestionLocal(index, {
                                    redirect_delay_sec: checked ? -1 : 3,
                                  })
                                }
                              />
                              Não abrir automaticamente — só quando a pessoa clicar no botão
                            </label>
                          ) : null}

                          <div className="flex flex-wrap items-end gap-6 pb-1">
                            <label className="flex items-center gap-2 text-sm">
                              <Switch
                                checked={q.active}
                                onCheckedChange={(v) => updateQuestionLocal(index, { active: v })}
                              />
                              Ativa
                            </label>
                          </div>

                          <details className="rounded-lg border px-3 py-2 text-sm">
                            <summary className="cursor-pointer text-muted-foreground">
                              Avançado (variável e saída)
                            </summary>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                              <Field
                                label="Variável"
                                hint="Nome usado em {{variavel}} e na ramificação. Sem espaços."
                              >
                                <Input
                                  value={q.key}
                                  onChange={(e) =>
                                    updateQuestionLocal(index, {
                                      key: e.target.value.replace(/\s+/g, ""),
                                    })
                                  }
                                />
                              </Field>
                              <Field label="Condição de saída">
                                <NextKeySelect
                                  value={q.next_key}
                                  currentKey={q.key}
                                  questionKeys={questionKeys}
                                  onChange={(next_key) =>
                                    updateQuestionLocal(index, { next_key })
                                  }
                                />
                              </Field>
                            </div>
                          </details>
                        </div>
                      ) : q.type === "media" ? (
                        <div className="space-y-4">
                          <Field label="Título / prompt">
                            <Input
                              value={q.prompt}
                              placeholder="Confira este conteúdo:"
                              onChange={(e) =>
                                updateQuestionLocal(index, { prompt: e.target.value })
                              }
                            />
                          </Field>
                          <Field
                            label="Mensagem do bot (opcional)"
                            hint="Texto antes da mídia. Blocos separados por linha em branco."
                          >
                            <Textarea
                              value={q.bot_messages_text}
                              rows={3}
                              className="font-mono text-xs"
                              onChange={(e) =>
                                updateQuestionLocal(index, {
                                  bot_messages_text: e.target.value,
                                })
                              }
                            />
                            <MessageFormatBar
                              value={q.bot_messages_text}
                              onChange={(bot_messages_text) =>
                                updateQuestionLocal(index, { bot_messages_text })
                              }
                              tokens={CORE_VARIABLE_CHIPS}
                            />
                          </Field>

                          <LeadMediaUploadInput
                            kind={parseMediaKind(q.label)}
                            url={q.placeholder}
                            onKindChange={(kind: MediaKind) =>
                              updateQuestionLocal(index, { label: kind })
                            }
                            onUrlChange={(url) =>
                              updateQuestionLocal(index, { placeholder: url })
                            }
                          />

                          <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Bônus de score">
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
                            <div className="flex flex-wrap items-end gap-6 pb-1">
                              <label className="flex items-center gap-2 text-sm">
                                <Switch
                                  checked={q.active}
                                  onCheckedChange={(v) =>
                                    updateQuestionLocal(index, { active: v })
                                  }
                                />
                                Ativa
                              </label>
                            </div>
                          </div>

                          <details className="rounded-lg border px-3 py-2 text-sm">
                            <summary className="cursor-pointer text-muted-foreground">
                              Avançado (variável e saída)
                            </summary>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                              <Field
                                label="Variável"
                                hint="Nome usado em {{variavel}} e na ramificação. Sem espaços."
                              >
                                <Input
                                  value={q.key}
                                  onChange={(e) =>
                                    updateQuestionLocal(index, {
                                      key: e.target.value.replace(/\s+/g, ""),
                                    })
                                  }
                                />
                              </Field>
                              <Field label="Condição de saída">
                                <NextKeySelect
                                  value={q.next_key}
                                  currentKey={q.key}
                                  questionKeys={questionKeys}
                                  onChange={(next_key) =>
                                    updateQuestionLocal(index, { next_key })
                                  }
                                />
                              </Field>
                            </div>
                          </details>
                        </div>
                      ) : (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                          label="Variável"
                          hint="Nome usado em {{variavel}} e na ramificação. Sem espaços."
                        >
                          <Input
                            value={q.key}
                            onChange={(e) =>
                              updateQuestionLocal(index, {
                                key: e.target.value.replace(/\s+/g, ""),
                              })
                            }
                          />
                        </Field>
                        <Field label="Tipo de bloco">
                          <Select
                            value={q.type}
                            onValueChange={(v) => {
                              const type = v as QuestionType;
                              const patch: Partial<QuestionDraft> = { type };
                              if (hasChoiceOptions(type) && q.options.filter((o) => !o._deleted).length === 0) {
                                patch.options = defaultOptionsForType(type);
                              }
                              if (type === "media") {
                                patch.required = false;
                                patch.label = parseMediaKind(q.label);
                              }
                              updateQuestionLocal(index, patch);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {BLOCK_MENU.map((section) =>
                                section.items.map((item) => (
                                  <SelectItem key={item.type} value={item.type}>
                                    {item.label}
                                  </SelectItem>
                                )),
                              )}
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field label="Label do campo">
                          <Input
                            value={q.label}
                            placeholder="Ex.: NOME COMPLETO"
                            onChange={(e) => updateQuestionLocal(index, { label: e.target.value })}
                          />
                        </Field>
                        <Field label="Placeholder">
                          <Input
                            value={q.placeholder}
                            onChange={(e) =>
                              updateQuestionLocal(index, { placeholder: e.target.value })
                            }
                          />
                        </Field>
                        <div className="sm:col-span-2">
                          <Field label="Pergunta no chat (prompt)">
                            <Textarea
                              value={q.prompt}
                              rows={2}
                              onChange={(e) =>
                                updateQuestionLocal(index, { prompt: e.target.value })
                              }
                            />
                            <MessageFormatBar
                              value={q.prompt}
                              onChange={(prompt) => updateQuestionLocal(index, { prompt })}
                            />
                          </Field>
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label>Mensagens do bot antes da pergunta</Label>
                          <Textarea
                            value={q.bot_messages_text}
                            rows={6}
                            className="font-mono text-xs"
                            placeholder={"Bloco 1 com *negrito*\n\nBloco 2 — use {{nome}}"}
                            onChange={(e) =>
                              updateQuestionLocal(index, {
                                bot_messages_text: e.target.value,
                              })
                            }
                          />
                          <MessageFormatBar
                            value={q.bot_messages_text}
                            onChange={(bot_messages_text) =>
                              updateQuestionLocal(index, { bot_messages_text })
                            }
                            tokens={CORE_VARIABLE_CHIPS}
                          />
                        </div>
                        {!hasChoiceOptions(q.type) && (
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
                        <Field label="Condição de saída (padrão do bloco)">
                          <NextKeySelect
                            value={q.next_key}
                            currentKey={q.key}
                            questionKeys={questionKeys}
                            onChange={(next_key) => updateQuestionLocal(index, { next_key })}
                          />
                        </Field>
                        <div className="flex flex-wrap items-center gap-6 sm:items-end sm:pb-1">
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
                      )}

                      {hasChoiceOptions(q.type) && (
                        <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium">Opções e ramificações</p>
                              <p className="text-xs text-muted-foreground">
                                Score e para onde o fluxo vai ao escolher.
                              </p>
                            </div>
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
                                      next_key: "",
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
                          <div className="grid gap-3">
                            {q.options.map((opt, oi) => {
                              if (opt._deleted) return null;
                              return (
                                <div
                                  key={opt.id || `new-${oi}`}
                                  className="grid gap-2 rounded-lg border bg-background/80 p-3 sm:grid-cols-[1fr_90px_minmax(160px,1fr)_40px]"
                                >
                                  <Input
                                    value={opt.label}
                                    placeholder="Texto da opção"
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
                                    placeholder="Score"
                                    onChange={(e) => {
                                      const options = q.options.map((o, i) =>
                                        i === oi
                                          ? { ...o, score_points: Number(e.target.value) || 0 }
                                          : o,
                                      );
                                      updateQuestionLocal(index, { options });
                                    }}
                                  />
                                  <NextKeySelect
                                    value={opt.next_key}
                                    currentKey={q.key}
                                    questionKeys={questionKeys}
                                    onChange={(next_key) => {
                                      const options = q.options.map((o, i) =>
                                        i === oi ? { ...o, next_key } : o,
                                      );
                                      updateQuestionLocal(index, { options });
                                    }}
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="justify-self-end sm:justify-self-auto"
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
                        <Button
                          onClick={() => saveQuestion(index)}
                          disabled={savingQuestionId === panelId}
                        >
                          <Save className="h-4 w-4" />
                          {savingQuestionId === panelId ? "Salvando…" : "Salvar bloco"}
                        </Button>
                        <Button variant="destructive" onClick={() => removeQuestion(index)}>
                          <Trash2 className="h-4 w-4" /> Remover
                        </Button>
                      </div>
                    </CardContent>
                  )}
                </Card>
                <div className="flex justify-center py-1">
                  <AddBlockMenu
                    size="sm"
                    variant="ghost"
                    align="center"
                    label="Adicionar bloco"
                    className="h-8 text-muted-foreground hover:text-foreground"
                    onAdd={(type) => addQuestion(type, index)}
                  />
                </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function LeadFormScorePanel() {
  const { meta, setMeta, maxScoreHint, savingMeta, saveMeta } = useLeadFormEditor();

  return (
    <Card className="border-gold/15 shadow-soft">
      <CardHeader>
        <CardTitle className="font-serif text-xl">Score e temperatura</CardTitle>
        <CardDescription>Defina os limites de pontuação que classificam o lead.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-3 gap-2">
          <Field label="Frio até">
            <Input
              type="number"
              min={0}
              value={meta.score_cold_max}
              onChange={(e) => setMeta({ ...meta, score_cold_max: Number(e.target.value) || 0 })}
            />
          </Field>
          <Field label="Morno até">
            <Input
              type="number"
              min={0}
              value={meta.score_warm_max}
              onChange={(e) => setMeta({ ...meta, score_warm_max: Number(e.target.value) || 0 })}
            />
          </Field>
          <Field label="Quente até">
            <Input
              type="number"
              min={0}
              value={meta.score_hot_max}
              onChange={(e) => setMeta({ ...meta, score_hot_max: Number(e.target.value) || 0 })}
            />
          </Field>
        </div>

        <div className="space-y-2">
          <Label>Prévia da classificação</Label>
          <div className="flex flex-col gap-1.5">
            <Badge variant="secondary" className="w-fit">
              {temperatureLabel("frio")} · 0 – {meta.score_cold_max}
            </Badge>
            <Badge variant="outline" className="w-fit">
              {temperatureLabel("morno")} · {meta.score_cold_max + 1} – {meta.score_warm_max}
            </Badge>
            <Badge className="w-fit">
              {temperatureLabel("quente")} · {meta.score_warm_max + 1} – {meta.score_hot_max}
            </Badge>
            <Badge className="w-fit border-gold bg-gold/90 text-background hover:bg-gold">
              {temperatureLabel("muito_quente")} · {meta.score_hot_max + 1}+
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Hoje o quiz pode somar até <span className="font-medium text-foreground">{maxScoreHint} pts</span>.
            Lead é qualificado (quente ou mais) a partir de{" "}
            <span className="font-medium text-foreground">{meta.score_warm_max + 1} pts</span>.
          </p>
        </div>

        <Field
          label="Delay de digitação do bot (ms)"
          hint="Tempo simulado de “digitando…” entre as mensagens do chat público."
        >
          <Input
            type="number"
            min={0}
            max={5000}
            step={50}
            value={meta.bot_delay_ms}
            onChange={(e) => setMeta({ ...meta, bot_delay_ms: Number(e.target.value) || 0 })}
          />
        </Field>

        <Button className="w-full" onClick={saveMeta} disabled={savingMeta}>
          <Save className="h-4 w-4" />
          {savingMeta ? "Salvando…" : "Salvar score"}
        </Button>
      </CardContent>
    </Card>
  );
}

type SimBubble = { id: string; role: "bot" | "user"; text: string };

export function LeadFormSimulatorPanel() {
  const { meta, questions, primaryDark, agentInitial } = useLeadFormEditor();
  const activeQuestions = useMemo(() => questions.filter((q) => q.active), [questions]);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [bubbles, setBubbles] = useState<SimBubble[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [done, setDone] = useState(activeQuestions.length === 0);
  const [session, setSession] = useState(0);
  const shownRef = useRef<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const answersRef = useRef(answers);
  const pushGenRef = useRef(0);
  answersRef.current = answers;

  const current = activeQuestions[stepIndex];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [bubbles, typing]);

  const pushBot = useCallback(
    async (messages: string[], gen: number) => {
      for (const msg of messages) {
        if (pushGenRef.current !== gen) return;
        setTyping(true);
        await new Promise((r) => setTimeout(r, meta.bot_delay_ms || 500));
        if (pushGenRef.current !== gen) {
          setTyping(false);
          return;
        }
        setTyping(false);
        setBubbles((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "bot",
            text: interpolateLeadTemplate(msg, buildLeadTemplateVars(answersRef.current)),
          },
        ]);
        await new Promise((r) => setTimeout(r, 100));
      }
    },
    [meta.bot_delay_ms],
  );

  useEffect(() => {
    if (!current) {
      setDone(true);
      return;
    }
    const shownKey = `${session}:${stepIndex}:${current.key}`;
    if (shownRef.current.has(shownKey)) return;
    shownRef.current.add(shownKey);
    const msgs = parseBotMessages(current.bot_messages_text);
    const prompt = current.prompt?.trim();
    if (prompt) msgs.push(prompt);
    if (msgs.length) {
      const gen = ++pushGenRef.current;
      void pushBot(msgs, gen);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, current, session]);

  const restart = () => {
    pushGenRef.current += 1;
    shownRef.current = new Set();
    setTyping(false);
    setBubbles([]);
    setAnswers({});
    setInput("");
    setDone(activeQuestions.length === 0);
    setStepIndex(0);
    setSession((s) => s + 1);
  };

  const advance = (value: string, optionNextKey?: string) => {
    if (!current || typing) return;
    const trimmed = value.trim() || (isContentOnlyType(current.type) ? "Continuar" : "");
    if (!trimmed && !isContentOnlyType(current.type)) return;
    setBubbles((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text: trimmed }]);
    setAnswers((prev) => ({
      ...prev,
      [current.key]: isContentOnlyType(current.type) ? "ok" : value.trim(),
    }));
    setInput("");
    const branchKey = optionNextKey || current.next_key;
    const next = resolveNextStepIndex(activeQuestions, stepIndex, branchKey);
    if (next === "end") {
      setDone(true);
      setStepIndex(activeQuestions.length);
      return;
    }
    setStepIndex(next);
  };

  return (
    <Card className="border-gold/15 shadow-luxe overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 py-3">
        <CardTitle className="font-serif text-xl">Simulador</CardTitle>
        <Button variant="outline" size="sm" onClick={restart} disabled={typing}>
          <RotateCcw className="h-4 w-4" /> Reiniciar
        </Button>
      </CardHeader>
      <CardContent className="pb-4 pt-0">
        {activeQuestions.length === 0 ? (
          <AdminEmptyState
            icon={Wand2}
            title="Nenhum bloco ativo"
            description="Adicione ou ative blocos no fluxo à esquerda para simular a conversa."
          />
        ) : (
          <div
            className="rounded-2xl p-3"
            style={{ background: meta.page_bg_light || "#1A5C4F" }}
          >
            <div
              className="mx-auto flex h-[min(72vh,620px)] w-full max-w-[380px] flex-col overflow-hidden rounded-[24px] border border-black/10 shadow-xl"
              style={{ background: "#e5ddd5" }}
            >
              <div
                className="relative shrink-0 px-4 pb-3 pt-3 text-white"
                style={{
                  background: `linear-gradient(180deg, ${meta.primary_color} 0%, ${primaryDark} 100%)`,
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/20 text-sm font-semibold ring-2 ring-white/25">
                    {meta.agent_avatar_url ? (
                      <img
                        src={meta.agent_avatar_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      agentInitial
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{meta.agent_name || "Agente"}</p>
                    <p className="truncate text-xs opacity-80">
                      {meta.header_subtitle || meta.agent_title || "Estou online"}
                      {meta.brand_name ? ` · ${meta.brand_name}` : ""}
                    </p>
                  </div>
                </div>
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-black/25">
                  <div
                    className="h-full rounded-full bg-white transition-all"
                    style={{
                      width: `${Math.round(
                        ((Math.min(stepIndex, activeQuestions.length) + (done ? 1 : 0)) /
                          Math.max(activeQuestions.length, 1)) *
                          100,
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div
                ref={scrollRef}
                className="relative flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto p-4"
                style={
                  meta.wallpaper_url
                    ? {
                        backgroundImage: `url(${meta.wallpaper_url})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : { background: "#e5ddd5" }
                }
              >
                <div className="mx-auto mb-1 rounded-full bg-black/5 px-3 py-1 text-[10px] font-medium text-muted-foreground backdrop-blur-sm">
                  Simulação · Hoje
                </div>
                {bubbles.map((b) => (
                  <div
                    key={b.id}
                    className={cn("flex", b.role === "user" ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-snug shadow-sm",
                        b.role === "user"
                          ? "rounded-tr-sm text-white"
                          : "rounded-tl-sm bg-white text-foreground [&_b]:font-semibold",
                      )}
                      style={b.role === "user" ? { background: meta.primary_color } : undefined}
                    >
                      {b.role === "bot" ? (
                        <span
                          dangerouslySetInnerHTML={{
                            __html: formatLeadMessageHtml(b.text),
                          }}
                        />
                      ) : (
                        b.text
                      )}
                    </div>
                  </div>
                ))}
                {typing && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm text-muted-foreground shadow-sm">
                      <span className="inline-flex gap-1">
                        <i className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground/50" />
                        <i className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground/50 [animation-delay:120ms]" />
                        <i className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground/50 [animation-delay:240ms]" />
                      </span>
                    </div>
                  </div>
                )}
                {done && (
                  <div className="mt-2 space-y-2 rounded-xl border border-dashed border-white/40 bg-white/80 p-3 text-center backdrop-blur-sm">
                    <p className="text-sm text-muted-foreground">Fim da simulação.</p>
                    <Button type="button" size="sm" variant="outline" onClick={restart}>
                      <RotateCcw className="h-4 w-4" /> Recomeçar
                    </Button>
                  </div>
                )}
              </div>

              {!done && current && !typing && (
                hasChoiceOptions(current.type) && current.type !== "multi" ? (
                  <div className="flex shrink-0 flex-col gap-2 border-t bg-[#f0f2f5]/95 p-3 backdrop-blur">
                    {current.options
                      .filter((o) => !o._deleted && o.active)
                      .map((o, i) => (
                        <button
                          key={o.id || i}
                          type="button"
                          onClick={() => advance(o.label, o.next_key)}
                          className="rounded-2xl border bg-white px-3.5 py-3 text-left text-sm font-medium shadow-sm transition hover:-translate-y-px hover:shadow"
                          style={{ boxShadow: `inset 4px 0 0 ${meta.primary_color}` }}
                        >
                          {o.label}
                        </button>
                      ))}
                  </div>
                ) : isContentOnlyType(current.type) || current.type === "lgpd" || current.type === "confirm" ? (
                  <div className="flex shrink-0 flex-col gap-2 border-t bg-[#f0f2f5]/95 p-3 backdrop-blur">
                    {current.type === "media"
                      ? (() => {
                          const media = resolveQuestionMedia(current);
                          return media ? (
                            <LeadMediaView kind={media.kind} url={media.url} className="!ml-0 max-w-full" />
                          ) : (
                            <p className="text-center text-[11px] text-muted-foreground">
                              Mídia não configurada
                            </p>
                          );
                        })()
                      : null}
                    {current.type === "redirect" && current.placeholder?.trim() ? (
                      <p className="text-center text-[11px] text-muted-foreground">
                        {(current.redirect_delay_sec ?? 3) < 0
                          ? "Só abre pelo botão · abre o link no quiz real"
                          : `Atraso: ${current.redirect_delay_sec ?? 3}s · abre o link no quiz real`}
                      </p>
                    ) : null}
                    <Button
                      type="button"
                      onClick={() => {
                        if (current.type === "redirect" && current.placeholder?.trim()) {
                          const url = resolveRedirectUrl(
                            current.placeholder.trim(),
                            {
                              ...answers,
                              [current.key]: current.placeholder,
                            },
                          );
                          window.open(url, "_blank", "noopener,noreferrer");
                        }
                        advance(current.type === "lgpd" ? "sim" : "ok");
                      }}
                      style={{ background: meta.primary_color }}
                      className="text-white"
                    >
                      {current.type === "lgpd"
                        ? "Aceito continuar"
                        : current.type === "confirm"
                          ? "Confirmar"
                          : current.type === "redirect"
                            ? "Abrir link"
                            : "Continuar"}
                    </Button>
                  </div>
                ) : current.type === "multi" ? (
                  <div className="flex shrink-0 flex-col gap-2 border-t bg-[#f0f2f5]/95 p-3 backdrop-blur">
                    {current.options
                      .filter((o) => !o._deleted && o.active)
                      .map((o, i) => {
                        const on = input.split(/\s*\|\s*/).includes(o.label);
                        return (
                          <button
                            key={o.id || i}
                            type="button"
                            onClick={() => {
                              const parts = input
                                .split(/\s*\|\s*/)
                                .map((s) => s.trim())
                                .filter(Boolean);
                              const next = on
                                ? parts.filter((p) => p !== o.label)
                                : [...parts, o.label];
                              setInput(next.join(" | "));
                            }}
                            className={cn(
                              "rounded-2xl border px-3.5 py-3 text-left text-sm font-medium shadow-sm",
                              on ? "bg-primary/10 border-primary" : "bg-white",
                            )}
                          >
                            {on ? "✓ " : ""}
                            {o.label}
                          </button>
                        );
                      })}
                    <Button
                      type="button"
                      disabled={!input.trim()}
                      onClick={() => advance(input)}
                      style={{ background: meta.primary_color }}
                      className="text-white"
                    >
                      Confirmar seleção
                    </Button>
                  </div>
                ) : (
                  <form
                    className="flex shrink-0 items-center gap-2 border-t bg-[#f0f2f5]/95 p-3 backdrop-blur"
                    onSubmit={(e) => {
                      e.preventDefault();
                      advance(input);
                    }}
                  >
                    <input
                      className="min-h-11 flex-1 rounded-full border-0 bg-white px-4 py-2.5 text-sm shadow-sm outline-none ring-1 ring-black/5 focus:ring-2"
                      style={{ ["--tw-ring-color" as string]: meta.primary_color }}
                      placeholder={
                        current.type === "date"
                          ? "dd/mm/aaaa"
                          : current.placeholder || "Digite sua resposta…"
                      }
                      inputMode={current.type === "date" ? "numeric" : undefined}
                      maxLength={current.type === "date" ? 10 : undefined}
                      value={input}
                      onChange={(e) =>
                        setInput(
                          current.type === "date"
                            ? formatDateMaskBr(e.target.value)
                            : e.target.value,
                        )
                      }
                    />
                    <Button
                      type="submit"
                      size="icon"
                      className="h-11 w-11 shrink-0 rounded-full shadow"
                      style={{ background: meta.primary_color }}
                      disabled={!input.trim()}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                )
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const CONVERSION_OPTIONS: Array<{
  value: ConversionMinTemperature;
  title: string;
  hint: string;
  includes: Array<"frio" | "morno" | "quente" | "muito_quente">;
}> = [
  {
    value: "any",
    title: "Qualquer resposta",
    hint: "Dispara em todo lead que completar o quiz, inclusive frios.",
    includes: ["frio", "morno", "quente", "muito_quente"],
  },
  {
    value: "morno",
    title: "Morno ou mais",
    hint: "Ignora leads frios; dispara a partir de morno.",
    includes: ["morno", "quente", "muito_quente"],
  },
  {
    value: "quente",
    title: "Quente ou mais",
    hint: "Recomendado: só leads qualificados (quente e muito quente).",
    includes: ["quente", "muito_quente"],
  },
  {
    value: "muito_quente",
    title: "Somente muito quente",
    hint: "Mais restrito: só o topo do funil dispara conversão paga.",
    includes: ["muito_quente"],
  },
];

function conversionTempChipClass(temp: string) {
  switch (temp) {
    case "muito_quente":
      return "border-transparent bg-gold text-background";
    case "quente":
      return "border-transparent bg-primary text-primary-foreground";
    case "morno":
      return "border-transparent bg-secondary text-secondary-foreground";
    default:
      return "bg-background text-muted-foreground";
  }
}

function conversionScoreHint(
  value: ConversionMinTemperature,
  bands: { cold: number; warm: number; hot: number },
) {
  switch (value) {
    case "any":
      return "0 pts ou mais";
    case "morno":
      return `${bands.cold + 1} pts ou mais`;
    case "quente":
      return `${bands.warm + 1} pts ou mais`;
    case "muito_quente":
      return `${bands.hot + 1} pts ou mais`;
  }
}

export function LeadFormPixelsPanel() {
  const { form, meta, integrations, setIntegrations, savingIntegrations, saveIntegrations } =
    useLeadFormEditor();
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [testingCapi, setTestingCapi] = useState(false);

  const scoreBands = {
    cold: meta.score_cold_max,
    warm: meta.score_warm_max,
    hot: meta.score_hot_max,
  };
  const selectedConversion =
    CONVERSION_OPTIONS.find((o) => o.value === integrations.conversion_min_temperature) ||
    CONVERSION_OPTIONS[2];

  const testWebhook = async () => {
    setTestingWebhook(true);
    try {
      await saveIntegrations();
      const result = await testLeadWebhookFn({
        data: { form_id: form.id, webhook_url: integrations.webhook_url.trim() || undefined },
      });
      toast.success(`Webhook OK${result.detail ? ` · ${result.detail}` : ""}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha no teste do webhook.");
    } finally {
      setTestingWebhook(false);
    }
  };

  const testCapi = async () => {
    setTestingCapi(true);
    try {
      await saveIntegrations();
      const result = await testMetaCapiFn({ data: { form_id: form.id } });
      toast.success(`CAPI enviado · eventId ${result.eventId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha no teste CAPI.");
    } finally {
      setTestingCapi(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-gold/15 shadow-soft">
        <CardHeader>
          <CardTitle className="font-serif text-xl">Tags de rastreamento</CardTitle>
          <CardDescription>Carregados no browser em /leads.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="GTM ID">
            <Input
              value={integrations.gtm_id}
              placeholder="GTM-XXXXXXX"
              onChange={(e) => setIntegrations({ ...integrations, gtm_id: e.target.value })}
            />
          </Field>
          <Field label="GA4 Measurement ID">
            <Input
              value={integrations.ga_measurement_id}
              placeholder="G-XXXXXXXXXX"
              onChange={(e) =>
                setIntegrations({ ...integrations, ga_measurement_id: e.target.value })
              }
            />
          </Field>
          <Field label="Google Ads ID">
            <Input
              value={integrations.google_ads_id}
              placeholder="AW-XXXXXXXXX"
              onChange={(e) => setIntegrations({ ...integrations, google_ads_id: e.target.value })}
            />
          </Field>
          <Field label="Google Ads — Rótulo de conversão">
            <Input
              value={integrations.google_ads_conversion_label}
              placeholder="AbCdEfGhIjK"
              onChange={(e) =>
                setIntegrations({ ...integrations, google_ads_conversion_label: e.target.value })
              }
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={integrations.gtm_enabled}
              onCheckedChange={(v) => setIntegrations({ ...integrations, gtm_enabled: v })}
            />
            Carregar GTM em /leads
          </label>
        </CardContent>
      </Card>

      <Card className="border-gold/15 shadow-soft">
        <CardHeader>
          <CardTitle className="font-serif text-xl">Meta Pixel + CAPI</CardTitle>
          <CardDescription>Pixel no browser, Conversions API no servidor.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Meta Pixel ID">
            <Input
              value={integrations.meta_pixel_id}
              placeholder="1234567890"
              onChange={(e) => setIntegrations({ ...integrations, meta_pixel_id: e.target.value })}
            />
          </Field>
          <Field
            label={`Access Token ${integrations.has_meta_token ? "(configurado — cole outro p/ substituir)" : ""}`}
          >
            <Input
              type="password"
              autoComplete="off"
              value={integrations.meta_access_token}
              placeholder={integrations.has_meta_token ? "•••••••• (deixe em branco p/ manter)" : "EAAB..."}
              onChange={(e) =>
                setIntegrations({ ...integrations, meta_access_token: e.target.value })
              }
            />
          </Field>
          <Field label="Test Event Code">
            <Input
              value={integrations.meta_test_event_code}
              placeholder="TEST12345"
              onChange={(e) =>
                setIntegrations({ ...integrations, meta_test_event_code: e.target.value })
              }
            />
          </Field>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={integrations.pixel_enabled}
                onCheckedChange={(v) => setIntegrations({ ...integrations, pixel_enabled: v })}
              />
              Pixel ativo
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={integrations.capi_enabled}
                onCheckedChange={(v) => setIntegrations({ ...integrations, capi_enabled: v })}
              />
              CAPI ativo
            </label>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={testCapi} disabled={testingCapi}>
            <FlaskConical className="h-4 w-4" /> {testingCapi ? "Testando…" : "Testar CAPI"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-gold/15 shadow-soft">
        <CardHeader>
          <CardTitle className="font-serif text-xl">Webhook CRM</CardTitle>
          <CardDescription>Enviado para leads qualificados (quente+).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="URL do webhook">
            <Input
              value={integrations.webhook_url}
              placeholder="https://seu-crm.com/api/webhooks/leads"
              onChange={(e) => setIntegrations({ ...integrations, webhook_url: e.target.value })}
            />
          </Field>
          <Field
            label={`Secret ${integrations.has_webhook_secret ? "(configurado — cole outro p/ substituir)" : ""}`}
          >
            <Input
              type="password"
              autoComplete="off"
              value={integrations.webhook_secret}
              placeholder={
                integrations.has_webhook_secret ? "•••••••• (deixe em branco p/ manter)" : "seu-segredo"
              }
              onChange={(e) => setIntegrations({ ...integrations, webhook_secret: e.target.value })}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={integrations.webhook_enabled}
              onCheckedChange={(v) => setIntegrations({ ...integrations, webhook_enabled: v })}
            />
            Webhook ativo
          </label>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={testWebhook}
            disabled={testingWebhook}
          >
            <FlaskConical className="h-4 w-4" /> {testingWebhook ? "Testando…" : "Testar webhook"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-gold/15 shadow-soft">
        <CardHeader>
          <CardTitle className="font-serif text-xl">Conversão mínima</CardTitle>
          <CardDescription>
            Temperatura mínima para disparar Pixel, CAPI e webhook de conversão paga.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={integrations.conversion_min_temperature}
            onValueChange={(v) =>
              setIntegrations({
                ...integrations,
                conversion_min_temperature: v as ConversionMinTemperature,
              })
            }
            className="grid gap-2"
          >
            {CONVERSION_OPTIONS.map((opt) => {
              const selected = integrations.conversion_min_temperature === opt.value;
              return (
                <label
                  key={opt.value}
                  className={cn(
                    "flex cursor-pointer gap-3 rounded-xl border p-3 transition",
                    selected
                      ? "border-gold/50 bg-gold/5 shadow-sm ring-1 ring-gold/30"
                      : "border-border/80 hover:border-foreground/20 hover:bg-muted/30",
                  )}
                >
                  <RadioGroupItem value={opt.value} className="mt-1 shrink-0" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <p className="text-sm font-medium leading-none">{opt.title}</p>
                      <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
                        {conversionScoreHint(opt.value, scoreBands)}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">{opt.hint}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(["frio", "morno", "quente", "muito_quente"] as const).map((temp) => {
                        const active = opt.includes.includes(temp);
                        return (
                          <Badge
                            key={temp}
                            variant="outline"
                            className={cn(
                              "text-[10px] font-medium",
                              active
                                ? conversionTempChipClass(temp)
                                : "border-dashed opacity-35",
                            )}
                          >
                            {temperatureLabel(temp)}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                </label>
              );
            })}
          </RadioGroup>

          <div className="rounded-lg border border-dashed bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
            Com{" "}
            <span className="font-medium text-foreground">{selectedConversion.title}</span>, a
            conversão paga dispara a partir de{" "}
            <span className="font-medium text-foreground">
              {conversionScoreHint(selectedConversion.value, scoreBands)}
            </span>
            . As faixas vêm da aba Score.
          </div>
        </CardContent>
      </Card>

      <Button className="w-full" onClick={saveIntegrations} disabled={savingIntegrations}>
        <Save className="h-4 w-4" />
        {savingIntegrations ? "Salvando…" : "Salvar integrações"}
      </Button>
    </div>
  );
}

export function LeadFormDiagnosisPanel() {
  const {
    rules,
    setRules,
    questionKeys,
    expandedRuleId,
    setExpandedRuleId,
    savingRuleId,
    saveRule,
    addRule,
    removeRule,
  } = useLeadFormEditor();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl">Resumo</h2>
          <p className="text-sm text-muted-foreground">
            Texto exibido após o quiz. Combine chave/valor ou use fallback.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={addRule}>
          <Plus className="h-4 w-4" /> Nova regra
        </Button>
      </div>

      <Card className="border-dashed border-gold/30 bg-champagne/20">
        <CardContent className="space-y-1 p-4 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Como funciona</p>
          <p>
            A primeira regra ativa cujo <strong>match</strong> bate com a resposta do lead é usada.
            Se nenhuma bater, entra a regra marcada como <strong>fallback</strong>.
          </p>
        </CardContent>
      </Card>

      {rules.length === 0 ? (
        <AdminEmptyState
          icon={Stethoscope}
          title="Nenhuma regra de resumo"
          description="Crie regras por tipo de evento (ou outra chave) e um fallback para o restante."
          actionLabel="Criar regra"
          onAction={addRule}
        />
      ) : (
        <div className="space-y-3">
          {rules.map((r, index) => {
            const panelId = r.id || `rule-${index}`;
            const open = expandedRuleId === panelId;
            const savingKey = r.id || `new-${index}`;
            return (
              <Card
                key={panelId}
                className={`border-gold/10 transition hover:border-primary/30 ${
                  !r.active ? "opacity-60" : ""
                } ${open ? "border-primary/40 shadow-soft" : ""}`}
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                  onClick={() => setExpandedRuleId(open ? null : panelId)}
                >
                  <div className="min-w-0 space-y-1.5">
                    <p className="truncate text-sm font-medium">{r.title || "Sem título"}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {r.is_fallback ? (
                        <Badge>Fallback</Badge>
                      ) : (
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {r.match_key || "—"} = {r.match_value || "—"}
                        </Badge>
                      )}
                      {!r.active && <Badge variant="secondary">Inativa</Badge>}
                    </div>
                  </div>
                </button>

                {open && (
                  <CardContent className="space-y-3 border-t pt-4">
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
                    <Field label="Match key">
                      {questionKeys.length > 0 ? (
                        <Select
                          value={r.match_key || "__none__"}
                          disabled={r.is_fallback}
                          onValueChange={(v) =>
                            setRules((prev) =>
                              prev.map((x, i) =>
                                i === index ? { ...x, match_key: v === "__none__" ? "" : v } : x,
                              ),
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Chave" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">—</SelectItem>
                            {questionKeys.map((key) => (
                              <SelectItem key={key} value={key}>
                                {key}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={r.match_key}
                          disabled={r.is_fallback}
                          onChange={(e) =>
                            setRules((prev) =>
                              prev.map((x, i) =>
                                i === index ? { ...x, match_key: e.target.value } : x,
                              ),
                            )
                          }
                        />
                      )}
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
                    <Field label="Texto do resumo">
                      <Textarea
                        rows={4}
                        value={r.body}
                        onChange={(e) =>
                          setRules((prev) =>
                            prev.map((x, i) => (i === index ? { ...x, body: e.target.value } : x)),
                          )
                        }
                      />
                      <MessageFormatBar
                        value={r.body}
                        onChange={(body) =>
                          setRules((prev) =>
                            prev.map((x, i) => (i === index ? { ...x, body } : x)),
                          )
                        }
                      />
                    </Field>
                    <div className="flex flex-wrap items-center gap-4">
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
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => saveRule(index)}
                        disabled={savingRuleId === savingKey}
                      >
                        <Save className="h-4 w-4" />
                        {savingRuleId === savingKey ? "Salvando…" : "Salvar regra"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => removeRule(index)}>
                        Remover
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
