import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  bookLeadSlotFn,
  completeLeadFn,
  getPublicAgendaSlotsFn,
  getPublicLeadFormFn,
  upsertLeadPartialFn,
} from "@/fns/leads/public";
import { formatPhoneMask, validateWhatsApp } from "@/lib/leads/phone";
import {
  ensureGtm,
  ensureMetaPixel,
  pushDataLayer,
  readCookie,
  trackPixel,
} from "@/lib/leads/tracking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PublicForm = Awaited<ReturnType<typeof getPublicLeadFormFn>>;
type Question = PublicForm["questions"][number];
type Slot = Awaited<ReturnType<typeof getPublicAgendaSlotsFn>>["slots"][number];

type ChatBubble = {
  id: string;
  role: "bot" | "user";
  html?: string;
  text?: string;
};

type Phase = "quiz" | "diagnosis" | "agenda" | "done";

function interpolate(text: string, answers: Record<string, string>) {
  return text.replace(/\{(\w+)\}/g, (_, key: string) => answers[key] || "");
}

function readUtms(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const keys = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "gclid",
    "fbclid",
  ];
  const out: Record<string, string> = {};
  for (const key of keys) {
    const value = params.get(key);
    if (value) out[key] = value;
  }
  return out;
}

function getAnonId() {
  const key = "pallazium_lead_anon";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

function validateAnswer(question: Question, value: string, answers: Record<string, string>) {
  const trimmed = value.trim();
  if (question.required && !trimmed) return "Resposta obrigatória.";
  if (question.type === "text" && trimmed.length < 2) return "Me diz seu nome pra continuar.";
  if (question.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
    return "Coloca um e-mail válido.";
  }
  if (question.type === "tel") return validateWhatsApp(trimmed);
  if (question.type === "date") {
    if (!trimmed) return "Escolhe uma data pra continuar.";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(`${trimmed}T00:00:00`);
    if (Number.isNaN(d.getTime())) return "Data inválida. Tenta de novo.";
    if (d < today) return "Essa data já passou. Escolhe uma data futura.";
  }
  void answers;
  return null;
}

export function LeadsQuiz({ form }: { form: PublicForm }) {
  const [phase, setPhase] = useState<Phase>("quiz");
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [bubbles, setBubbles] = useState<ChatBubble[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState<{ title: string; body: string } | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const startedRef = useRef(false);
  const shownStepsRef = useRef<Set<number>>(new Set());
  const answersRef = useRef(answers);
  const listRef = useRef<HTMLDivElement>(null);
  const anonId = useMemo(() => (typeof window !== "undefined" ? getAnonId() : ""), []);
  const utm = useMemo(() => readUtms(), []);
  const questions = form.questions;
  const current = questions[stepIndex];
  const progress = phase === "quiz" ? Math.min(stepIndex / Math.max(questions.length, 1), 1) : 1;
  answersRef.current = answers;

  useEffect(() => {
    if (form.tracking.gtmId) ensureGtm(form.tracking.gtmId);
    if (form.tracking.metaPixelId) ensureMetaPixel(form.tracking.metaPixelId);
    if (!startedRef.current) {
      startedRef.current = true;
      pushDataLayer("quiz_started", { form: form.slug });
    }
  }, [form]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [bubbles, typing, phase]);

  const pushBotMessages = useCallback(async (messages: string[]) => {
    for (const msg of messages) {
      setTyping(true);
      await new Promise((r) => setTimeout(r, 450));
      setTyping(false);
      setBubbles((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "bot",
          html: interpolate(msg, answersRef.current),
        },
      ]);
      await new Promise((r) => setTimeout(r, 120));
    }
  }, []);

  useEffect(() => {
    if (phase !== "quiz" || !current) return;
    if (shownStepsRef.current.has(stepIndex)) return;
    shownStepsRef.current.add(stepIndex);
    let cancelled = false;
    (async () => {
      const msgs = [...(current.botMessages || [])];
      if (current.prompt && !msgs.includes(current.prompt)) {
        msgs.push(current.prompt);
      }
      if (!cancelled && msgs.length) await pushBotMessages(msgs);
    })();
    return () => {
      cancelled = true;
    };
  }, [stepIndex, phase, current, pushBotMessages]);

  const trackingMeta = () => ({
    fbp: readCookie("_fbp") || undefined,
    fbc: readCookie("_fbc") || undefined,
    sourceUrl: typeof window !== "undefined" ? window.location.href : undefined,
    utm,
    anonId,
  });

  const finishQuiz = async (nextAnswers: Record<string, string>) => {
    setBusy(true);
    try {
      const result = await completeLeadFn({
        data: {
          slug: form.slug,
          leadId: leadId || undefined,
          answers: nextAnswers,
          ...trackingMeta(),
        },
      });
      setLeadId(result.leadId);
      setDiagnosis(result.diagnosis);
      pushDataLayer("quiz_lead", {
        lead_id: result.leadId,
        event_id: result.eventId,
        score: result.score,
        qualified: result.qualified,
      });
      trackPixel("Lead", { content_name: form.slug, value: result.score }, result.eventId);
      setPhase("diagnosis");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o lead.");
    } finally {
      setBusy(false);
    }
  };

  const advance = async (value: string) => {
    if (!current || busy) return;
    const err = validateAnswer(current, value, answers);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    const nextAnswers = { ...answers, [current.key]: value.trim() };
    setAnswers(nextAnswers);
    setBubbles((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", text: value.trim() },
    ]);
    setInput("");

    if (current.key === "whatsapp") {
      setBusy(true);
      try {
        const partial = await upsertLeadPartialFn({
          data: {
            slug: form.slug,
            leadId: leadId || undefined,
            name: nextAnswers.nome,
            email: nextAnswers.email,
            whatsapp: value.trim(),
            answers: nextAnswers,
            ...trackingMeta(),
          },
        });
        setLeadId(partial.leadId);
        pushDataLayer("quiz_partial", { lead_id: partial.leadId });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao salvar contato.");
        setBusy(false);
        return;
      } finally {
        setBusy(false);
      }
    }

    const nextIndex = stepIndex + 1;
    if (nextIndex >= questions.length) {
      await finishQuiz(nextAnswers);
      return;
    }
    setStepIndex(nextIndex);
  };

  const openAgenda = async () => {
    setBusy(true);
    try {
      const { slots: list } = await getPublicAgendaSlotsFn({ data: { slug: form.slug } });
      setSlots(list.filter((s) => s.available));
      setPhase("agenda");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar a agenda.");
    } finally {
      setBusy(false);
    }
  };

  const bookSlot = async (slot: Slot) => {
    if (!leadId) return;
    setBusy(true);
    try {
      const result = await bookLeadSlotFn({
        data: {
          slug: form.slug,
          leadId,
          slot: slot.id,
          ...trackingMeta(),
        },
      });
      setWhatsappUrl(result.whatsappUrl);
      pushDataLayer("quiz_schedule", {
        lead_id: result.leadId,
        event_id: result.eventId,
        slot: result.slot,
      });
      trackPixel("Schedule", { content_name: slot.id }, result.eventId);
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível agendar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col bg-[radial-gradient(ellipse_at_top,#fff8f1,transparent_55%),linear-gradient(180deg,#f4efe8_0%,#ebe2d6_100%)]">
      <header className="sticky top-0 z-10 border-b border-border/40 bg-[#f4efe8]/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-sm">
            {form.agentName.slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-serif text-lg leading-tight text-foreground">{form.brandName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {form.agentName}
              {form.agentTitle ? ` · ${form.agentTitle}` : ""}
            </p>
          </div>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border/60">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </header>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-5">
        {bubbles.map((b) => (
          <div
            key={b.id}
            className={cn(
              "max-w-[88%] animate-in fade-in slide-in-from-bottom-2 duration-300 rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
              b.role === "bot"
                ? "bg-card text-foreground"
                : "ml-auto bg-primary text-primary-foreground",
            )}
          >
            {b.html ? (
              <span dangerouslySetInnerHTML={{ __html: b.html }} />
            ) : (
              b.text
            )}
          </div>
        ))}
        {typing && (
          <div className="w-fit rounded-2xl bg-card px-4 py-3 text-muted-foreground shadow-sm">
            <span className="inline-flex gap-1">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:120ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:240ms]" />
            </span>
          </div>
        )}

        {phase === "diagnosis" && diagnosis && (
          <div className="animate-in fade-in zoom-in-95 space-y-4 rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
            <p className="font-serif text-2xl text-foreground">{diagnosis.title}</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{diagnosis.body}</p>
            {form.agendaEnabled ? (
              <Button className="w-full" onClick={openAgenda} disabled={busy}>
                Agendar degustação
              </Button>
            ) : (
              <Button className="w-full" asChild>
                <a
                  href={`https://wa.me/${form.whatsappDestination.replace(/\D/g, "")}?text=${encodeURIComponent(form.whatsappMessage || "Olá!")}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Falar no WhatsApp
                </a>
              </Button>
            )}
          </div>
        )}

        {phase === "agenda" && (
          <div className="space-y-3">
            <p className="font-serif text-xl">Escolha um horário</p>
            <div className="grid gap-2">
              {slots.map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  disabled={busy || !slot.available}
                  onClick={() => bookSlot(slot)}
                  className="rounded-xl border border-border/60 bg-card px-4 py-3 text-left text-sm transition hover:border-primary/50 hover:bg-primary/5 disabled:opacity-50"
                >
                  <span className="font-medium capitalize">{slot.label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {slot.remaining} vaga{slot.remaining === 1 ? "" : "s"}
                  </span>
                </button>
              ))}
              {slots.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum horário disponível no momento.</p>
              )}
            </div>
          </div>
        )}

        {phase === "done" && (
          <div className="space-y-4 rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
            <p className="font-serif text-2xl">Degustação reservada</p>
            <p className="text-sm text-muted-foreground">
              Recebemos seu horário. Se quiser, já pode falar com a gente no WhatsApp para confirmar os detalhes.
            </p>
            {whatsappUrl && (
              <Button className="w-full" asChild>
                <a href={whatsappUrl} target="_blank" rel="noreferrer">
                  Abrir WhatsApp
                </a>
              </Button>
            )}
          </div>
        )}
      </div>

      {phase === "quiz" && current && (
        <div className="border-t border-border/40 bg-[#f4efe8]/95 px-4 py-3 backdrop-blur">
          {error && <p className="mb-2 text-xs text-destructive">{error}</p>}
          {current.type === "choice" ? (
            <div className="grid gap-2">
              {current.options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  disabled={busy}
                  onClick={() => advance(opt.label)}
                  className="rounded-xl border border-border/70 bg-card px-3 py-2.5 text-left text-sm transition hover:border-primary/40 hover:bg-primary/5"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ) : (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                advance(input);
              }}
            >
              <Input
                type={
                  current.type === "email"
                    ? "email"
                    : current.type === "date"
                      ? "date"
                      : current.type === "tel"
                        ? "tel"
                        : "text"
                }
                value={input}
                placeholder={current.placeholder || ""}
                disabled={busy}
                className="h-11 rounded-xl bg-card"
                onChange={(e) => {
                  const v =
                    current.type === "tel" ? formatPhoneMask(e.target.value) : e.target.value;
                  setInput(v);
                }}
              />
              <Button type="submit" disabled={busy || !input.trim()} className="h-11 px-5">
                Enviar
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
