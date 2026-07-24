import {
  Link,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  testLeadWebhookFn,
  testMetaCapiFn,
  updateLeadFormFn,
  updateLeadIntegrationsFn,
} from "@/fns/leads/admin";
import { AdminEmptyState } from "@/components/AdminEmptyState";
import { StorageImageInput } from "@/components/StorageImageInput";
import { VariableChips } from "@/components/leads/form-editor/VariableChips";
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
import { LEAD_PRIMARY_PRESETS, darkenHex } from "@/lib/leads/theme";
import { temperatureLabel, type ConversionMinTemperature } from "@/lib/leads/score";
import { CORE_VARIABLE_CHIPS, buildLeadTemplateVars, interpolateLeadTemplate } from "@/lib/leads/variables";
import { cn } from "@/lib/utils";
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

type MetaState = {
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

type IntegrationsState = {
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

type LeadFormEditorContextValue = {
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
  addQuestion: () => void;
  removeQuestion: (index: number) => Promise<void>;
  moveQuestion: (index: number, dir: -1 | 1) => Promise<void>;
  saveRule: (index: number) => Promise<void>;
  addRule: () => void;
  removeRule: (index: number) => Promise<void>;
};

const LeadFormEditorContext = createContext<LeadFormEditorContextValue | null>(null);

const TYPE_LABEL: Record<QuestionType, string> = {
  text: "Texto",
  email: "E-mail",
  tel: "WhatsApp",
  choice: "Escolha",
  date: "Data",
};

const NAV_ITEMS = [
  { to: "/admin/leads/formulario/score", label: "Score", icon: Gauge },
  { to: "/admin/leads/formulario/visual", label: "Visual", icon: Palette },
  { to: "/admin/leads/formulario/simulador", label: "Simulador", icon: Wand2 },
  { to: "/admin/leads/formulario/pixels", label: "Pixels", icon: Webhook },
  { to: "/admin/leads/formulario/diagnostico", label: "Diagnóstico", icon: Stethoscope },
] as const;

const navPillClass =
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:text-foreground";
const navPillActiveClass = "bg-background text-foreground shadow-sm";

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

export function useLeadFormEditor() {
  const ctx = useContext(LeadFormEditorContext);
  if (!ctx) {
    throw new Error("useLeadFormEditor must be used within LeadFormEditorProvider");
  }
  return ctx;
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
      if (q.type === "choice") {
        const best = Math.max(
          0,
          ...q.options.filter((o) => !o._deleted && o.active).map((o) => o.score_points),
        );
        max += best;
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
    const savingKey = q.id || q.key;
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
            sort_order: opt.sort_order,
            active: opt.active,
          },
        });
      }

      toast.success(`Bloco “${q.key}” salvo`);
      await load();
      setExpandedId(saved.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar pergunta.");
    } finally {
      setSavingQuestionId(null);
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
    if (!window.confirm(`Remover o bloco “${q.key}”?`)) return;
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
      toast.success("Regra de diagnóstico salva");
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
        title: "Novo diagnóstico",
        body: "Texto do diagnóstico…",
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
    <LeadFormEditorContext.Provider value={value}>{children}</LeadFormEditorContext.Provider>
  );
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
              Visual do chat, perguntas, pontuação e diagnósticos — o que o visitante vê em{" "}
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
                {activeRules} diagnóstico{activeRules === 1 ? "" : "s"}
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

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
        <LeadFormFlowColumn />

        <aside className="space-y-3 lg:sticky lg:top-6 lg:self-start">
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

export function LeadFormFlowColumn() {
  const {
    meta,
    setMeta,
    savingMeta,
    saveMeta,
    questions,
    expandedId,
    setExpandedId,
    savingQuestionId,
    updateQuestionLocal,
    saveQuestion,
    addQuestion,
    removeQuestion,
    moveQuestion,
  } = useLeadFormEditor();

  return (
    <div className="space-y-5">
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

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl">Fluxo do quiz</h2>
            <p className="text-sm text-muted-foreground">
              Ordem = sequência no chat. Separe mensagens do bot com linha em branco; use os
              chips de variável para inserir <code className="rounded bg-muted px-1">{"{{nome}}"}</code>.
            </p>
          </div>
          <Button onClick={addQuestion}>
            <Plus className="h-4 w-4" /> Adicionar bloco
          </Button>
        </div>

        {questions.length === 0 ? (
          <AdminEmptyState
            icon={MessageSquareText}
            title="Nenhum bloco ainda"
            description="Crie o primeiro bloco de pergunta do quiz. Comece pelas de múltipla escolha para pontuar o lead."
            actionLabel="Adicionar bloco"
            onAction={addQuestion}
          />
        ) : (
          <div className="space-y-3">
            {questions.map((q, index) => {
              const panelId = q.id || q.key;
              const open = expandedId === panelId;
              const choiceMax = Math.max(
                0,
                ...q.options.filter((o) => !o._deleted).map((o) => o.score_points),
              );
              return (
                <Card
                  key={panelId}
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
                          {q.key}
                        </Badge>
                        <Badge variant="secondary">{TYPE_LABEL[q.type] || q.type}</Badge>
                        {q.required && <Badge variant="outline">Obrigatória</Badge>}
                        {!q.active && <Badge variant="secondary">Inativa</Badge>}
                        <Badge variant="outline">
                          {q.type === "choice"
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
                            onValueChange={(v) =>
                              updateQuestionLocal(index, { type: v as QuestionType })
                            }
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
                          </Field>
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label>Mensagens do bot antes da pergunta</Label>
                          <Textarea
                            value={q.bot_messages_text}
                            rows={6}
                            className="font-mono text-xs"
                            placeholder={"Bloco 1\n\nBloco 2 — use {{nome}}"}
                            onChange={(e) =>
                              updateQuestionLocal(index, {
                                bot_messages_text: e.target.value,
                              })
                            }
                          />
                          <VariableChips
                            tokens={CORE_VARIABLE_CHIPS}
                            onInsert={(token) =>
                              updateQuestionLocal(index, {
                                bot_messages_text: q.bot_messages_text
                                  ? `${q.bot_messages_text} ${token}`
                                  : token,
                              })
                            }
                          />
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

                      {q.type === "choice" && (
                        <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
                          <div className="flex items-center justify-between gap-2">
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
                            {q.options.map((opt, oi) => {
                              if (opt._deleted) return null;
                              return (
                                <div
                                  key={opt.id || `new-${oi}`}
                                  className="grid gap-2 sm:grid-cols-[1fr_100px_40px]"
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

export function LeadFormVisualPanel() {
  const { meta, setMeta, maxScoreHint, primaryDark, agentInitial, savingMeta, saveMeta } =
    useLeadFormEditor();

  return (
    <div className="space-y-4">
      <Card className="border-gold/15 shadow-soft">
        <CardHeader>
          <CardTitle className="font-serif text-xl">Cor e imagens</CardTitle>
          <CardDescription>
            Avatar e fundos. O app escolhe claro/escuro pelo tema do celular do visitante.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-3">
            <Label>Cor primária</Label>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="color"
                value={meta.primary_color}
                onChange={(e) => setMeta({ ...meta, primary_color: e.target.value })}
                className="h-11 w-14 cursor-pointer rounded-lg border bg-transparent p-1"
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
                  aria-label={`Usar cor ${color}`}
                  onClick={() => setMeta({ ...meta, primary_color: color })}
                  className={`h-8 w-8 rounded-full border-2 shadow ring-1 ring-black/10 transition ${
                    meta.primary_color.toLowerCase() === color.toLowerCase()
                      ? "border-foreground scale-110"
                      : "border-white"
                  }`}
                  style={{ background: color }}
                />
              ))}
            </div>
          </div>

          <StorageImageInput
            bucket="leads"
            folder="avatars"
            name="agent_avatar"
            label="Avatar"
            hideFolderHint
            previewClassName="h-32 rounded-xl border bg-muted bg-cover bg-center"
            defaultValue={meta.agent_avatar_url}
            onValueChange={(url) => setMeta({ ...meta, agent_avatar_url: url })}
          />
          <StorageImageInput
            bucket="leads"
            folder="wallpapers"
            name="wallpaper_light"
            label="Fundo claro"
            hideFolderHint
            previewClassName="h-32 rounded-xl border bg-muted bg-cover bg-center"
            defaultValue={meta.wallpaper_url}
            onValueChange={(url) => setMeta({ ...meta, wallpaper_url: url })}
          />
          <StorageImageInput
            bucket="leads"
            folder="wallpapers"
            name="wallpaper_dark"
            label="Fundo escuro"
            hideFolderHint
            previewClassName="h-32 rounded-xl border bg-muted bg-cover bg-center"
            defaultValue={meta.wallpaper_dark_url}
            onValueChange={(url) => setMeta({ ...meta, wallpaper_dark_url: url })}
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Fundo da página (claro)</Label>
              <input
                type="color"
                value={meta.page_bg_light}
                onChange={(e) => setMeta({ ...meta, page_bg_light: e.target.value })}
                className="h-10 w-full cursor-pointer rounded-lg border bg-transparent p-1"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fundo da página (escuro)</Label>
              <input
                type="color"
                value={meta.page_bg_dark}
                onChange={(e) => setMeta({ ...meta, page_bg_dark: e.target.value })}
                className="h-10 w-full cursor-pointer rounded-lg border bg-transparent p-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-gold/15 shadow-soft">
        <CardHeader>
          <CardTitle className="font-serif text-xl">SEO</CardTitle>
          <CardDescription>Título e descrição usados na aba do navegador e em compartilhamentos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label={`Título SEO (${meta.seo_title.length}/60)`}>
            <Input
              maxLength={60}
              value={meta.seo_title}
              onChange={(e) => setMeta({ ...meta, seo_title: e.target.value })}
              placeholder="Diagnóstico do evento — Espaço Pallazium"
            />
          </Field>
          <Field label={`Descrição SEO (${meta.seo_description.length}/160)`}>
            <Textarea
              rows={3}
              maxLength={160}
              value={meta.seo_description}
              onChange={(e) => setMeta({ ...meta, seo_description: e.target.value })}
              placeholder="Conheça a Bella Festa e prepare uma proposta personalizada para o seu evento."
            />
          </Field>
        </CardContent>
      </Card>

      <Card className="border-gold/15 shadow-soft">
        <CardHeader>
          <CardTitle className="font-serif text-xl">WhatsApp</CardTitle>
          <CardDescription>
            Para onde o visitante é enviado ao final do chat.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field
            label="Número do WhatsApp da equipe"
            hint="Só números, com DDI. Ex.: 5511999999999."
          >
            <Input
              value={meta.whatsapp_destination}
              placeholder="5511999999999"
              onChange={(e) => setMeta({ ...meta, whatsapp_destination: e.target.value })}
            />
          </Field>
          <div className="space-y-1.5">
            <Label>Mensagem pronta do WhatsApp</Label>
            <Input
              value={meta.whatsapp_message}
              onChange={(e) => setMeta({ ...meta, whatsapp_message: e.target.value })}
            />
            <VariableChips
              tokens={CORE_VARIABLE_CHIPS}
              onInsert={(token) =>
                setMeta({
                  ...meta,
                  whatsapp_message: meta.whatsapp_message
                    ? `${meta.whatsapp_message} ${token}`
                    : token,
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-gold/20 shadow-luxe">
        <CardHeader className="pb-3">
          <CardTitle className="font-serif text-xl">Preview ao vivo</CardTitle>
          <CardDescription>Como o header do chat fica agora.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div
            className="mx-3 mb-3 overflow-hidden rounded-2xl border shadow-md"
            style={{ background: meta.wallpaper_url ? undefined : "#f0f2f5" }}
          >
            <div
              className="flex items-center gap-3 px-3 py-3 text-white"
              style={{
                background: `linear-gradient(180deg, ${meta.primary_color} 0%, ${primaryDark} 100%)`,
              }}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/20 text-sm font-semibold ring-2 ring-white/30">
                {meta.agent_avatar_url ? (
                  <img src={meta.agent_avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  agentInitial
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{meta.agent_name || "Agente"}</p>
                <p className="truncate text-[11px] opacity-80">
                  {meta.header_subtitle || meta.agent_title || "Estou online"}
                  {meta.brand_name ? ` · ${meta.brand_name}` : ""}
                </p>
              </div>
            </div>
            <div
              className="relative min-h-[180px] p-3"
              style={
                meta.wallpaper_url
                  ? {
                      backgroundImage: `url(${meta.wallpaper_url})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }
                  : undefined
              }
            >
              <div className="absolute inset-0 bg-black/5" />
              <div className="relative space-y-2">
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-xs shadow-sm">
                  Olá! Eu sou a {meta.agent_name || "assistente"} do {meta.brand_name || "espaço"}.
                </div>
                <div
                  className="ml-auto max-w-[70%] rounded-2xl rounded-tr-sm px-3 py-2 text-xs text-white shadow-sm"
                  style={{ background: meta.primary_color }}
                >
                  Sim, quero!
                </div>
              </div>
            </div>
          </div>
          <div className="border-t bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
            Quiz pode somar até <span className="font-medium text-foreground">{maxScoreHint} pts</span>.
          </div>
        </CardContent>
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden">
        <Button className="w-full" onClick={saveMeta} disabled={savingMeta}>
          <Save className="h-4 w-4" />
          {savingMeta ? "Salvando…" : "Salvar visual"}
        </Button>
      </div>
    </div>
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
  const shownRef = useRef<Set<number>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const current = activeQuestions[stepIndex];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [bubbles, typing]);

  const pushBot = useCallback(
    async (messages: string[]) => {
      for (const msg of messages) {
        setTyping(true);
        await new Promise((r) => setTimeout(r, meta.bot_delay_ms || 500));
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
    if (shownRef.current.has(stepIndex)) return;
    shownRef.current.add(stepIndex);
    const msgs = parseBotMessages(current.bot_messages_text);
    const prompt = current.prompt?.trim();
    if (prompt) msgs.push(prompt);
    if (msgs.length) void pushBot(msgs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, current]);

  const restart = () => {
    shownRef.current = new Set();
    setStepIndex(0);
    setAnswers({});
    setBubbles([]);
    setInput("");
    setTyping(false);
    setDone(activeQuestions.length === 0);
  };

  const advance = (value: string) => {
    if (!current || !value.trim()) return;
    const trimmed = value.trim();
    setBubbles((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text: trimmed }]);
    setAnswers((prev) => ({ ...prev, [current.key]: trimmed }));
    setInput("");
    const nextIndex = stepIndex + 1;
    if (nextIndex >= activeQuestions.length) {
      setDone(true);
    }
    setStepIndex(nextIndex);
  };

  return (
    <Card className="border-gold/15 shadow-soft">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="font-serif text-xl">Simulador</CardTitle>
          <CardDescription>Teste o fluxo do quiz sem salvar dados reais.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={restart}>
          <RotateCcw className="h-4 w-4" /> Reiniciar
        </Button>
      </CardHeader>
      <CardContent>
        {activeQuestions.length === 0 ? (
          <AdminEmptyState
            icon={Wand2}
            title="Nenhum bloco ativo"
            description="Adicione ou ative blocos no fluxo à esquerda para simular a conversa."
          />
        ) : (
          <div className="mx-auto w-full max-w-[320px] overflow-hidden rounded-[24px] border shadow-lg">
            <div
              className="flex items-center gap-2 px-3 py-2.5 text-white"
              style={{
                background: `linear-gradient(180deg, ${meta.primary_color} 0%, ${primaryDark} 100%)`,
              }}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/20 text-xs font-semibold">
                {meta.agent_avatar_url ? (
                  <img src={meta.agent_avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  agentInitial
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold">{meta.agent_name || "Agente"}</p>
                <p className="truncate text-[10px] opacity-80">
                  {meta.header_subtitle || meta.agent_title || "online"}
                </p>
              </div>
            </div>
            <div ref={scrollRef} className="flex h-80 flex-col gap-2 overflow-y-auto bg-[#e5ddd5] p-3">
              {bubbles.map((b) => (
                <div key={b.id} className={cn("flex", b.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3 py-2 text-xs shadow-sm",
                      b.role === "user" ? "text-white" : "bg-white text-foreground",
                    )}
                    style={b.role === "user" ? { background: meta.primary_color } : undefined}
                  >
                    {b.text}
                  </div>
                </div>
              ))}
              {typing && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-white px-3 py-2 text-xs text-muted-foreground shadow-sm">
                    digitando…
                  </div>
                </div>
              )}
              {done && (
                <div className="mt-2 rounded-xl border border-dashed bg-white/60 p-3 text-center text-xs text-muted-foreground">
                  Fim do fluxo simulado.
                </div>
              )}
            </div>
            {!done && current && !typing && (
              current.type === "choice" ? (
                <div className="flex flex-col gap-1.5 border-t bg-background p-3">
                  {current.options
                    .filter((o) => !o._deleted && o.active)
                    .map((o, i) => (
                      <button
                        key={o.id || i}
                        type="button"
                        onClick={() => advance(o.label)}
                        className="rounded-xl border px-3 py-2 text-left text-xs font-medium shadow-sm transition hover:-translate-y-px"
                        style={{ boxShadow: `inset 3px 0 0 ${meta.primary_color}` }}
                      >
                        {o.label}
                      </button>
                    ))}
                </div>
              ) : (
                <form
                  className="flex items-center gap-2 border-t bg-background p-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    advance(input);
                  }}
                >
                  <input
                    className="flex-1 rounded-full border px-3 py-2 text-xs outline-none"
                    placeholder={current.placeholder || "Digite sua resposta…"}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="h-8 w-8 shrink-0 rounded-full"
                    style={{ background: meta.primary_color }}
                    disabled={!input.trim()}
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </form>
              )
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const CONVERSION_OPTIONS: Array<{ value: ConversionMinTemperature; label: string }> = [
  { value: "any", label: "Qualquer resposta" },
  { value: "morno", label: "Morno ou mais" },
  { value: "quente", label: "Quente ou mais" },
  { value: "muito_quente", label: "Somente muito quente" },
];

export function LeadFormPixelsPanel() {
  const { form, integrations, setIntegrations, savingIntegrations, saveIntegrations } =
    useLeadFormEditor();
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [testingCapi, setTestingCapi] = useState(false);

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
            Temperatura mínima para disparar Pixel/CAPI/webhook de conversão paga.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={integrations.conversion_min_temperature}
            onValueChange={(v) =>
              setIntegrations({
                ...integrations,
                conversion_min_temperature: v as ConversionMinTemperature,
              })
            }
          >
            {CONVERSION_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-sm">
                <RadioGroupItem value={opt.value} />
                {opt.label}
              </label>
            ))}
          </RadioGroup>
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
          <h2 className="font-serif text-xl">Diagnóstico</h2>
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
          title="Nenhuma regra de diagnóstico"
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
                    <Field label="Texto do diagnóstico">
                      <Textarea
                        rows={4}
                        value={r.body}
                        onChange={(e) =>
                          setRules((prev) =>
                            prev.map((x, i) => (i === index ? { ...x, body: e.target.value } : x)),
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
