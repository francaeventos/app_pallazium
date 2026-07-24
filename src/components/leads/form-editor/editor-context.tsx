import { useNavigate } from "@tanstack/react-router";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
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
  updateLeadIntegrationsFn,
} from "@/fns/leads/admin";
import { Label } from "@/components/ui/label";
import { AppConfirmDialog } from "@/components/AppConfirmDialog";
import { darkenHex } from "@/lib/leads/theme";
import { type ConversionMinTemperature } from "@/lib/leads/score";
import {
  defaultOptionsForType,
  defaultPromptForType,
  hasChoiceOptions,
  type LeadQuestionTypeValue,
} from "@/lib/leads/question-types";
import { toast } from "sonner";

export type FormData = Awaited<ReturnType<typeof getAdminLeadFormFn>>["form"];
export type Question = FormData["questions"][number];
export type Rule = FormData["rules"][number];
export type QuestionType = LeadQuestionTypeValue;

export type QuestionDraft = {
  /** Id estável no editor (não muda ao editar a variável/key). */
  localId: string;
  id?: string;
  key: string;
  type: QuestionType;
  label: string;
  prompt: string;
  bot_messages_text: string;
  placeholder: string;
  redirect_delay_sec: number;
  next_key: string;
  sort_order: number;
  required: boolean;
  score_bonus: number;
  active: boolean;
  options: Array<{
    id?: string;
    label: string;
    score_points: number;
    next_key: string;
    sort_order: number;
    active: boolean;
    _deleted?: boolean;
  }>;
};

export type RuleDraft = {
  id?: string;
  title: string;
  body: string;
  match_key: string;
  match_value: string;
  sort_order: number;
  is_fallback: boolean;
  active: boolean;
};

export type MetaState = {
  title: string;
  brand_name: string;
  agent_name: string;
  agent_title: string;
  agent_avatar_url: string;
  primary_color: string;
  wallpaper_url: string;
  wallpaper_dark_url: string;
  header_subtitle: string;
  whatsapp_destination: string;
  whatsapp_message: string;
  qualification_threshold: number;
  score_cold_max: number;
  score_warm_max: number;
  score_hot_max: number;
  bot_delay_ms: number;
  seo_title: string;
  seo_description: string;
  page_bg_light: string;
  page_bg_dark: string;
  active: boolean;
};

export type IntegrationsState = {
  gtm_id: string;
  ga_measurement_id: string;
  google_ads_id: string;
  google_ads_conversion_label: string;
  meta_pixel_id: string;
  meta_access_token: string;
  meta_test_event_code: string;
  webhook_url: string;
  webhook_secret: string;
  conversion_min_temperature: ConversionMinTemperature;
  pixel_enabled: boolean;
  gtm_enabled: boolean;
  capi_enabled: boolean;
  webhook_enabled: boolean;
  has_meta_token: boolean;
  has_webhook_secret: boolean;
};

export type LeadFormEditorContextValue = {
  form: FormData;
  meta: MetaState;
  setMeta: Dispatch<SetStateAction<MetaState>>;
  integrations: IntegrationsState;
  setIntegrations: Dispatch<SetStateAction<IntegrationsState>>;
  questions: QuestionDraft[];
  setQuestions: Dispatch<SetStateAction<QuestionDraft[]>>;
  rules: RuleDraft[];
  setRules: Dispatch<SetStateAction<RuleDraft[]>>;
  expandedId: string | null;
  setExpandedId: Dispatch<SetStateAction<string | null>>;
  expandedRuleId: string | null;
  setExpandedRuleId: Dispatch<SetStateAction<string | null>>;
  savingMeta: boolean;
  savingQuestionId: string | null;
  savingRuleId: string | null;
  savingIntegrations: boolean;
  maxScoreHint: number;
  questionKeys: string[];
  activeQuestions: number;
  activeRules: number;
  primaryDark: string;
  agentInitial: string;
  saveMeta: () => Promise<void>;
  saveIntegrations: () => Promise<void>;
  updateQuestionLocal: (index: number, patch: Partial<QuestionDraft>) => void;
  saveQuestion: (index: number) => Promise<void>;
  addQuestion: (type?: QuestionType, afterIndex?: number) => void;
  removeQuestion: (index: number) => Promise<void>;
  moveQuestion: (index: number, dir: -1 | 1) => Promise<void>;
  saveRule: (index: number) => Promise<void>;
  addRule: () => void;
  removeRule: (index: number) => Promise<void>;
};

const LeadFormEditorContext = createContext<LeadFormEditorContextValue | null>(null);

export function toQuestionDraft(q: Question): QuestionDraft {
  return {
    localId: q.id,
    id: q.id,
    key: q.key,
    type: q.type as QuestionType,
    label: q.label || "",
    prompt: q.prompt || "",
    bot_messages_text: (q.bot_messages || []).join("\n\n"),
    placeholder: q.placeholder || "",
    redirect_delay_sec: q.redirect_delay_sec ?? 3,
    next_key: q.next_key || "",
    sort_order: q.sort_order,
    required: q.required,
    score_bonus: q.score_bonus,
    active: q.active,
    options: q.options.map((o) => ({
      id: o.id,
      label: o.label,
      score_points: o.score_points,
      next_key: o.next_key || "",
      sort_order: o.sort_order,
      active: o.active,
    })),
  };
}

export function toRuleDraft(r: Rule): RuleDraft {
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

export function parseBotMessages(text: string) {
  return text
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function useLeadFormEditor() {
  const ctx = useContext(LeadFormEditorContext);
  if (!ctx) {
    throw new Error("useLeadFormEditor must be used within LeadFormEditorProvider");
  }
  return ctx;
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function LeadFormEditorProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormData | null>(null);
  const [meta, setMeta] = useState<MetaState>({
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
    qualification_threshold: 50,
    score_cold_max: 24,
    score_warm_max: 49,
    score_hot_max: 74,
    bot_delay_ms: 850,
    seo_title: "",
    seo_description: "",
    page_bg_light: "#1A5C4F",
    page_bg_dark: "#0B141A",
    active: true,
  });
  const [integrations, setIntegrations] = useState<IntegrationsState>({
    gtm_id: "",
    ga_measurement_id: "",
    google_ads_id: "",
    google_ads_conversion_label: "",
    meta_pixel_id: "",
    meta_access_token: "",
    meta_test_event_code: "",
    webhook_url: "",
    webhook_secret: "",
    conversion_min_temperature: "quente",
    pixel_enabled: true,
    gtm_enabled: true,
    capi_enabled: true,
    webhook_enabled: true,
    has_meta_token: false,
    has_webhook_secret: false,
  });
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [rules, setRules] = useState<RuleDraft[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    description: string;
    confirmLabel?: string;
    resolve: (ok: boolean) => void;
  } | null>(null);

  const askConfirm = (opts: {
    title: string;
    description: string;
    confirmLabel?: string;
  }) =>
    new Promise<boolean>((resolve) => {
      setConfirmDialog({ ...opts, resolve });
    });

  const closeConfirm = (ok: boolean) => {
    confirmDialog?.resolve(ok);
    setConfirmDialog(null);
  };
  const [savingMeta, setSavingMeta] = useState(false);
  const [savingQuestionId, setSavingQuestionId] = useState<string | null>(null);
  const [savingRuleId, setSavingRuleId] = useState<string | null>(null);
  const [savingIntegrations, setSavingIntegrations] = useState(false);

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
        score_cold_max: data.score_cold_max,
        score_warm_max: data.score_warm_max,
        score_hot_max: data.score_hot_max,
        bot_delay_ms: data.bot_delay_ms,
        seo_title: data.seo_title || "",
        seo_description: data.seo_description || "",
        page_bg_light: data.page_bg_light || "#1A5C4F",
        page_bg_dark: data.page_bg_dark || "#0B141A",
        active: data.active,
      });
      setIntegrations({
        gtm_id: data.integrations.gtm_id || "",
        ga_measurement_id: data.integrations.ga_measurement_id || "",
        google_ads_id: data.integrations.google_ads_id || "",
        google_ads_conversion_label: data.integrations.google_ads_conversion_label || "",
        meta_pixel_id: data.integrations.meta_pixel_id || "",
        meta_access_token: "",
        meta_test_event_code: data.integrations.meta_test_event_code || "",
        webhook_url: data.integrations.webhook_url || "",
        webhook_secret: "",
        conversion_min_temperature:
          (data.integrations.conversion_min_temperature as ConversionMinTemperature) || "quente",
        pixel_enabled: data.integrations.pixel_enabled,
        gtm_enabled: data.integrations.gtm_enabled,
        capi_enabled: data.integrations.capi_enabled,
        webhook_enabled: data.integrations.webhook_enabled,
        has_meta_token: data.integrations.has_meta_token,
        has_webhook_secret: data.integrations.has_webhook_secret,
      });
      const drafts = data.questions.map(toQuestionDraft);
      setQuestions(drafts);
      setRules(data.rules.map(toRuleDraft));
      if (!expandedId && drafts[0]?.id) setExpandedId(drafts[0].id);
      if (!expandedRuleId && data.rules[0]?.id) setExpandedRuleId(data.rules[0].id);
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
      const opts = q.options.filter((o) => !o._deleted && o.active);
      if (q.type === "multi") {
        max += opts.reduce((sum, o) => sum + o.score_points, 0);
      } else if (hasChoiceOptions(q.type)) {
        max += Math.max(0, ...opts.map((o) => o.score_points));
      } else {
        max += q.score_bonus;
      }
    }
    return max;
  }, [questions]);

  const questionKeys = useMemo(
    () => questions.filter((q) => q.key.trim()).map((q) => q.key.trim()),
    [questions],
  );

  const activeQuestions = questions.filter((q) => q.active).length;
  const activeRules = rules.filter((r) => r.active).length;
  const primaryDark = darkenHex(meta.primary_color);
  const agentInitial = (meta.agent_name || "B").trim().slice(0, 1).toUpperCase();

  const saveMeta = async () => {
    if (!form) return;
    setSavingMeta(true);
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
          score_cold_max: meta.score_cold_max,
          score_warm_max: meta.score_warm_max,
          score_hot_max: meta.score_hot_max,
          bot_delay_ms: meta.bot_delay_ms,
          seo_title: meta.seo_title || null,
          seo_description: meta.seo_description || null,
          page_bg_light: meta.page_bg_light || null,
          page_bg_dark: meta.page_bg_dark || null,
          agenda_enabled: false,
          active: meta.active,
        },
      });
      toast.success("Configuração salva");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar.");
    } finally {
      setSavingMeta(false);
    }
  };

  const saveIntegrations = async () => {
    if (!form) return;
    setSavingIntegrations(true);
    try {
      await updateLeadIntegrationsFn({
        data: {
          form_id: form.id,
          gtm_id: integrations.gtm_id.trim() || null,
          ga_measurement_id: integrations.ga_measurement_id.trim() || null,
          google_ads_id: integrations.google_ads_id.trim() || null,
          google_ads_conversion_label: integrations.google_ads_conversion_label.trim() || null,
          meta_pixel_id: integrations.meta_pixel_id.trim() || null,
          meta_access_token: integrations.meta_access_token.trim() || undefined,
          meta_test_event_code: integrations.meta_test_event_code.trim() || null,
          webhook_url: integrations.webhook_url.trim() || null,
          webhook_secret: integrations.webhook_secret.trim() || undefined,
          conversion_min_temperature: integrations.conversion_min_temperature,
          pixel_enabled: integrations.pixel_enabled,
          gtm_enabled: integrations.gtm_enabled,
          capi_enabled: integrations.capi_enabled,
          webhook_enabled: integrations.webhook_enabled,
        },
      });
      toast.success("Integrações salvas — já valem em /leads");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar integrações.");
    } finally {
      setSavingIntegrations(false);
    }
  };

  const updateQuestionLocal = (index: number, patch: Partial<QuestionDraft>) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  };

  const saveQuestion = async (index: number) => {
    if (!form) return;
    const q = questions[index];
    if (!q.key.trim()) {
      toast.error("Informe a chave da pergunta (ex.: investimento).");
      return;
    }
    const savingKey = q.localId;
    setSavingQuestionId(savingKey);
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
          redirect_delay_sec: q.redirect_delay_sec ?? 3,
          next_key: q.next_key || null,
          sort_order: index,
          required: q.required,
          score_bonus: q.score_bonus,
          active: q.active,
        },
      });

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
            next_key: opt.next_key || null,
            sort_order: opt.sort_order,
            active: opt.active,
          },
        });
      }

      toast.success(`Bloco “${q.key}” salvo`);

      const orderedIds = questions
        .map((item, i) => (i === index ? saved.id : item.id))
        .filter(Boolean) as string[];
      if (form && orderedIds.length === questions.length) {
        try {
          await reorderLeadQuestionsFn({
            data: { form_id: form.id, ordered_ids: orderedIds },
          });
        } catch {
          // load abaixo ainda sincroniza o melhor possível
        }
      }

      await load();
      setExpandedId(saved.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar pergunta.");
    } finally {
      setSavingQuestionId(null);
    }
  };

  const addQuestion = (type: QuestionType = "choice", afterIndex?: number) => {
    const localId = `new_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const key = `bloco_${Date.now().toString().slice(-4)}`;
    const insertAt =
      afterIndex == null
        ? questions.length
        : Math.min(Math.max(afterIndex + 1, 0), questions.length);
    const draft: QuestionDraft = {
      localId,
      key,
      type,
      label: type === "media" ? "image" : "",
      prompt: defaultPromptForType(type),
      bot_messages_text: type === "message" ? "Olá! 👋" : "",
      placeholder: type === "redirect" ? "https://" : "",
      redirect_delay_sec: 3,
      next_key: "",
      sort_order: insertAt,
      required: type !== "message" && type !== "redirect" && type !== "media",
      score_bonus: 0,
      active: true,
      options: defaultOptionsForType(type),
    };
    setQuestions((prev) => {
      const next = [...prev];
      next.splice(insertAt, 0, draft);
      return next.map((q, i) => ({ ...q, sort_order: i }));
    });
    setExpandedId(localId);
  };

  const removeQuestion = async (index: number) => {
    const q = questions[index];
    const ok = await askConfirm({
      title: "Remover bloco?",
      description: `Tem certeza que deseja remover o bloco “${q.prompt || q.label || q.key}”? Esta ação não pode ser desfeita.`,
      confirmLabel: "Remover",
    });
    if (!ok) return;
    if (!q.id) {
      setQuestions((prev) => prev.filter((_, i) => i !== index));
      return;
    }
    try {
      await deleteLeadQuestionFn({ data: { id: q.id } });
      toast.success("Bloco removido");
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
      toast.message("Salve os blocos novos antes de reordenar no banco.");
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
    const savingKey = r.id || `new-${index}`;
    setSavingRuleId(savingKey);
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
      toast.success("Regra de resumo salva");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar regra.");
    } finally {
      setSavingRuleId(null);
    }
  };

  const addRule = () => {
    const nextIndex = rules.length;
    setRules((prev) => [
      ...prev,
      {
        title: "Novo resumo",
        body: "Texto do resumo…",
        match_key: questionKeys[0] || "tipoEvento",
        match_value: "",
        sort_order: prev.length,
        is_fallback: false,
        active: true,
      },
    ]);
    setExpandedRuleId(`rule-${nextIndex}`);
    void navigate({ to: "/admin/leads/formulario/diagnostico" });
  };

  const removeRule = async (index: number) => {
    const r = rules[index];
    const ok = await askConfirm({
      title: "Remover regra?",
      description: `Tem certeza que deseja remover a regra “${r.title}”? Esta ação não pode ser desfeita.`,
      confirmLabel: "Remover",
    });
    if (!ok) return;
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
    return (
      <div className="mx-auto max-w-7xl space-y-4 p-4 lg:p-8">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-80 animate-pulse rounded bg-muted" />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="h-96 animate-pulse rounded-2xl bg-muted" />
          <div className="h-96 animate-pulse rounded-2xl bg-muted" />
        </div>
      </div>
    );
  }

  const value: LeadFormEditorContextValue = {
    form,
    meta,
    setMeta,
    integrations,
    setIntegrations,
    questions,
    setQuestions,
    rules,
    setRules,
    expandedId,
    setExpandedId,
    expandedRuleId,
    setExpandedRuleId,
    savingMeta,
    savingQuestionId,
    savingRuleId,
    savingIntegrations,
    maxScoreHint,
    questionKeys,
    activeQuestions,
    activeRules,
    primaryDark,
    agentInitial,
    saveMeta,
    saveIntegrations,
    updateQuestionLocal,
    saveQuestion,
    addQuestion,
    removeQuestion,
    moveQuestion,
    saveRule,
    addRule,
    removeRule,
  };

  return (
    <LeadFormEditorContext.Provider value={value}>
      {children}
      <AppConfirmDialog
        open={Boolean(confirmDialog)}
        title={confirmDialog?.title || ""}
        description={confirmDialog?.description || ""}
        confirmLabel={confirmDialog?.confirmLabel || "Confirmar"}
        destructive
        onConfirm={() => closeConfirm(true)}
        onCancel={() => closeConfirm(false)}
      />
    </LeadFormEditorContext.Provider>
  );
}
