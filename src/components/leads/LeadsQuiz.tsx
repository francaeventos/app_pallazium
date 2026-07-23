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

  const brandParts = form.brandName.split(/\s+/);
  const brandMain = brandParts[0] || form.brandName;
  const brandRest = brandParts.slice(1).join(" ");

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

  const pushBotMessages = useCallback(async (messages: Array<{ html: string; isQuestion?: boolean }>) => {
    for (const msg of messages) {
      setTyping(true);
      await new Promise((r) => setTimeout(r, 420));
      setTyping(false);
      setBubbles((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "bot",
          html: interpolate(msg.html, answersRef.current),
          isQuestion: msg.isQuestion,
        },
      ]);
      await new Promise((r) => setTimeout(r, 110));
    }
  }, []);

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

  const agentInitial = form.agentName.trim().slice(0, 1).toUpperCase() || "B";

  return (
    <div className="leads-bella">
      <header className="lb-topbar">
        <div className="lb-brand">
          {brandMain}
          {brandRest ? <> {brandRest}</> : null}
          <span> · {form.agentName}</span>
        </div>
        <div className="lb-progress" aria-hidden>
          <i style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      </header>

      <div ref={listRef} className="lb-chat">
        {bubbles.map((b) =>
          b.role === "bot" ? (
            <div key={b.id} className="lb-row">
              <div className="lb-avatar">{agentInitial}</div>
              <div
                className={`lb-bubble${b.isQuestion ? " q" : ""}`}
                dangerouslySetInnerHTML={{ __html: b.html || "" }}
              />
            </div>
          ) : (
            <div key={b.id} className="lb-row me">
              <div className="lb-bubble">{b.text}</div>
            </div>
          ),
        )}

        {typing && (
          <div className="lb-row">
            <div className="lb-avatar">{agentInitial}</div>
            <div className="lb-bubble">
              <div className="lb-typing">
                <i />
                <i />
                <i />
              </div>
            </div>
          </div>
        )}

        {phase === "diagnosis" && diagnosis && (
          <div className="lb-row">
            <div className="lb-avatar">{agentInitial}</div>
            <div className="lb-diag">
              <h4>Diagnóstico</h4>
              <strong>{diagnosis.title}</strong>
              <p>{diagnosis.body}</p>
              {form.agendaEnabled ? (
                <button type="button" className="lb-cta" onClick={openAgenda} disabled={busy}>
                  Agendar degustação
                </button>
              ) : (
                <a
                  className="lb-cta wa"
                  href={`https://wa.me/${form.whatsappDestination.replace(/\D/g, "")}?text=${encodeURIComponent(form.whatsappMessage || "Olá!")}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Falar no WhatsApp
                </a>
              )}
            </div>
          </div>
        )}

        {phase === "agenda" && (
          <div className="lb-agenda">
            <div className="lb-agenda-head">
              <h3>Escolha um horário</h3>
              <p>Degustação no Espaço Pallazium</p>
            </div>
            <div className="lb-agenda-body">
              {error && <p className="lb-error" style={{ marginLeft: 0 }}>{error}</p>}
              <div className="lb-times">
                {slots.map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    className="lb-time"
                    disabled={busy || !slot.available}
                    onClick={() => bookSlot(slot)}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
              {slots.length === 0 && (
                <p style={{ textAlign: "center", color: "var(--lb-muted)", fontSize: 13, marginTop: 12 }}>
                  Nenhum horário disponível no momento.
                </p>
              )}
            </div>
          </div>
        )}

        {phase === "done" && (
          <div className="lb-row">
            <div className="lb-avatar">{agentInitial}</div>
            <div className="lb-diag">
              <h4>Confirmado</h4>
              <strong>Degustação reservada</strong>
              <p>
                {bookedSlot
                  ? `Horário: ${bookedSlot}. `
                  : ""}
                Se quiser, já pode falar conosco no WhatsApp para alinhar os detalhes.
              </p>
              {whatsappUrl && (
                <a className="lb-cta wa" href={whatsappUrl} target="_blank" rel="noreferrer">
                  Abrir WhatsApp
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {phase === "quiz" && current && (
        <div className="lb-composer">
          <div className="lb-ibox">
            {error && <p className="lb-error">{error}</p>}
            {current.label && current.type !== "choice" && (
              <div className="lb-flabel">{current.label}</div>
            )}
            {current.type === "choice" ? (
              <div className="lb-options">
                {current.options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className="lb-opt"
                    disabled={busy}
                    onClick={() => advance(opt.label)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  advance(input);
                }}
              >
                <div className={`lb-field${current.type === "tel" ? " phone" : ""}`}>
                  {current.type === "tel" && (
                    <div className="lb-cc">
                      BR <b>+55</b>
                    </div>
                  )}
                  <input
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
                    onChange={(e) => {
                      const v =
                        current.type === "tel" ? formatPhoneMask(e.target.value) : e.target.value;
                      setInput(v);
                    }}
                  />
                  <button
                    type="submit"
                    className="lb-send"
                    disabled={busy || !input.trim()}
                    aria-label="Enviar"
                  >
                    →
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
