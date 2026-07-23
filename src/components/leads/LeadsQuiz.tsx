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
import "./leads-quiz.css";

type PublicForm = Awaited<ReturnType<typeof getPublicLeadFormFn>>;
type Question = PublicForm["questions"][number];
type Slot = Awaited<ReturnType<typeof getPublicAgendaSlotsFn>>["slots"][number];

type ChatBubble = {
  id: string;
  role: "bot" | "user";
  html?: string;
  text?: string;
  isQuestion?: boolean;
  time: string;
};

type Phase = "quiz" | "diagnosis" | "agenda" | "done";

const BOT_DELAY_MS = 900;

function nowTime() {
  return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

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

function validateAnswer(question: Question, value: string) {
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
  return null;
}

function stripHtmlToTitleBody(html: string): { title?: string; body: string } {
  const plain = html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/?b>/gi, "**");
  const parts = plain.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length > 1) {
    return { title: parts[0].replace(/\*\*/g, ""), body: parts.slice(1).join(" ") };
  }
  return { body: html };
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
  const [bookedSlot, setBookedSlot] = useState<string | null>(null);
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

  const agentInitial = form.agentName.trim().slice(0, 1).toUpperCase() || "B";

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
  }, [bubbles, typing, phase, current]);

  const pushBotMessages = useCallback(
    async (messages: Array<{ html: string; isQuestion?: boolean }>) => {
      for (const msg of messages) {
        setTyping(true);
        await new Promise((r) => setTimeout(r, BOT_DELAY_MS));
        setTyping(false);
        setBubbles((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "bot",
            html: interpolate(msg.html, answersRef.current),
            isQuestion: msg.isQuestion,
            time: nowTime(),
          },
        ]);
        await new Promise((r) => setTimeout(r, 120));
      }
    },
    [],
  );

  useEffect(() => {
    if (phase !== "quiz" || !current) return;
    if (shownStepsRef.current.has(stepIndex)) return;
    shownStepsRef.current.add(stepIndex);
    let cancelled = false;
    (async () => {
      const msgs = (current.botMessages || []).map((html) => ({ html, isQuestion: false }));
      if (current.prompt) msgs.push({ html: current.prompt, isQuestion: true });
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
    const err = validateAnswer(current, value);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    const nextAnswers = { ...answers, [current.key]: value.trim() };
    setAnswers(nextAnswers);
    setBubbles((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", text: value.trim(), time: nowTime() },
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
      setBookedSlot(slot.label);
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

  const showOptions = phase === "quiz" && current?.type === "choice" && !typing && !busy;

  return (
    <div className="sf-root sf-page-frame-light">
      <div className="sf-phone">
        <header className="sf-header">
          <div className="sf-avatar">
            {form.agentAvatarUrl ? (
              <img src={form.agentAvatarUrl} alt={form.agentName} />
            ) : (
              agentInitial
            )}
          </div>
          <div className="sf-header-text">
            <div className="sf-header-name">{form.agentName}</div>
            <div className="sf-header-sub">
              {form.agentTitle || "diagnóstico online"} · {form.brandName}
            </div>
          </div>
          <div className="sf-progress" aria-hidden>
            <i style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        </header>

        <div className="sf-body">
          <div className="sf-wallpaper" aria-hidden />
          <div ref={listRef} className="sf-scroll">
            <div className="sf-date-chip">Hoje</div>

            {bubbles.map((b) => {
              if (b.role === "user") {
                return (
                  <div key={b.id} className="sf-row me">
                    <div className="sf-bubble-user">
                      {b.text}
                      <div className="sf-meta">
                        <span>{b.time}</span>
                        <span className="checks">✓✓</span>
                      </div>
                    </div>
                  </div>
                );
              }

              const parsed = stripHtmlToTitleBody(b.html || "");
              return (
                <div key={b.id} className="sf-row">
                  <div className="sf-bubble-bot">
                    {b.isQuestion || !parsed.title ? (
                      <span dangerouslySetInnerHTML={{ __html: b.html || "" }} />
                    ) : (
                      <>
                        <div>{parsed.title}</div>
                        <div
                          className="sf-bubble-body"
                          dangerouslySetInnerHTML={{ __html: parsed.body }}
                        />
                      </>
                    )}
                    <div className="sf-meta">
                      <span>{b.time}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {typing && (
              <div className="sf-row">
                <div className="sf-bubble-bot">
                  <div className="sf-typing">
                    digitando
                    <span className="sf-typing-dots">
                      <i />
                      <i />
                      <i />
                    </span>
                  </div>
                </div>
              </div>
            )}

            {showOptions && (
              <div className="sf-options">
                {current.options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className="sf-option"
                    disabled={busy}
                    onClick={() => advance(opt.label)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {phase === "diagnosis" && diagnosis && (
              <div className="sf-card">
                <h4>Diagnóstico</h4>
                <strong>{diagnosis.title}</strong>
                <p>{diagnosis.body}</p>
                {form.agendaEnabled ? (
                  <button type="button" className="sf-cta" onClick={openAgenda} disabled={busy}>
                    Agendar degustação
                  </button>
                ) : (
                  <a
                    className="sf-cta wa"
                    href={`https://wa.me/${form.whatsappDestination.replace(/\D/g, "")}?text=${encodeURIComponent(form.whatsappMessage || "Olá!")}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Falar no WhatsApp
                  </a>
                )}
              </div>
            )}

            {phase === "agenda" && (
              <div className="sf-card">
                <h4>Agenda</h4>
                <strong>Escolha um horário</strong>
                <p>Degustação no {form.brandName}</p>
                {error && <p className="sf-error">{error}</p>}
                <div className="sf-times">
                  {slots.map((slot) => (
                    <button
                      key={slot.id}
                      type="button"
                      className="sf-time"
                      disabled={busy || !slot.available}
                      onClick={() => bookSlot(slot)}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
                {slots.length === 0 && (
                  <p style={{ marginTop: 10, fontSize: 13.5, color: "var(--sf-bubble-text-secondary)" }}>
                    Nenhum horário disponível no momento.
                  </p>
                )}
              </div>
            )}

            {phase === "done" && (
              <div className="sf-card">
                <h4>Confirmado</h4>
                <strong>Degustação reservada</strong>
                <p>
                  {bookedSlot ? `Horário: ${bookedSlot}. ` : ""}
                  Se quiser, já pode falar conosco no WhatsApp.
                </p>
                {whatsappUrl && (
                  <a className="sf-cta wa" href={whatsappUrl} target="_blank" rel="noreferrer">
                    Abrir WhatsApp
                  </a>
                )}
              </div>
            )}
          </div>

          {phase === "quiz" && current && current.type !== "choice" && (
            <div className="sf-composer">
              {error && <p className="sf-error">{error}</p>}
              {current.label && <div className="sf-flabel">{current.label}</div>}
              <form
                className="sf-composer-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  advance(input);
                }}
              >
                <div className="sf-input-wrap">
                  {current.type === "tel" && <span className="cc">BR +55</span>}
                  <input
                    className="sf-input"
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
                    placeholder={current.placeholder || "Digite sua resposta…"}
                    disabled={busy || typing}
                    onChange={(e) => {
                      const v =
                        current.type === "tel" ? formatPhoneMask(e.target.value) : e.target.value;
                      setInput(v);
                    }}
                  />
                </div>
                <button
                  type="submit"
                  className="sf-send"
                  disabled={busy || typing || !input.trim()}
                  aria-label="Enviar"
                >
                  ➤
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
