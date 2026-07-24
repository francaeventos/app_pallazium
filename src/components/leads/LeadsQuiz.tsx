import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  completeLeadFn,
  getPublicLeadFormFn,
  upsertLeadPartialFn,
} from "@/fns/leads/public";
import { formatPhoneMask, validateWhatsApp } from "@/lib/leads/phone";
import { formatDateMaskBr, formatLeadDateBr, parseLeadDate, validateLeadDate } from "@/lib/leads/date";
import {
  ensureGtm,
  ensureMetaPixel,
  pushDataLayer,
  resolveFbc,
  resolveFbp,
  trackPixel,
} from "@/lib/leads/tracking";
import { darkenHex } from "@/lib/leads/theme";
import {
  hasChoiceOptions,
  isContentOnlyType,
  resolveNextStepIndex,
} from "@/lib/leads/question-types";
import { buildLeadTemplateVars, interpolateLeadTemplate, formatLeadMessageHtml, resolveRedirectUrl } from "@/lib/leads/variables";
import {
  clearQuizProgress,
  hasRecoverableContact,
  questionSignature,
  restoreQuizProgress,
  saveQuizProgress,
  type QuizProgressBubble,
} from "@/lib/leads/progress-storage";
import { captureLeadUtm } from "@/lib/leads/utm";
import { LeadMediaView, resolveQuestionMedia } from "@/components/leads/LeadMediaView";
import "./leads-quiz.css";

type PublicForm = Awaited<ReturnType<typeof getPublicLeadFormFn>>;
type Question = PublicForm["questions"][number];

type ChatBubble = {
  id: string;
  role: "bot" | "user";
  html?: string;
  text?: string;
  isQuestion?: boolean;
  time: string;
};

type Phase = "quiz" | "diagnosis";

function nowTime() {
  return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function interpolate(text: string, answers: Record<string, string>) {
  return interpolateLeadTemplate(text, buildLeadTemplateVars(answers));
}

function formatBubbleHtml(text: string, answers: Record<string, string>) {
  return formatLeadMessageHtml(interpolate(text, answers));
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
  if (isContentOnlyType(question.type)) return null;
  if (question.type === "lgpd") {
    if (question.required && !/^(sim|aceito|true|1|ok)$/i.test(trimmed)) {
      return "Aceite a política para continuar.";
    }
    return null;
  }
  if (question.required && !trimmed) return "Resposta obrigatória.";
  if (question.type === "text" && trimmed.length < 2) return "Me diz seu nome pra continuar.";
  if (question.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
    return "Coloca um e-mail válido.";
  }
  if (question.type === "tel") return validateWhatsApp(trimmed);
  if (question.type === "number") {
    if (!trimmed || Number.isNaN(Number(trimmed.replace(",", ".")))) {
      return "Informe um número válido.";
    }
  }
  if (question.type === "multi" && !trimmed) return "Escolha ao menos uma opção.";
  if (question.type === "date") return validateLeadDate(trimmed);
  return null;
}

function stripHtmlToTitleBody(html: string): { title?: string; body: string } {
  const plain = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?b>/gi, "")
    .replace(/<\/?strong>/gi, "");
  const parts = plain.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length > 1) {
    return { title: parts[0], body: parts.slice(1).join(" ") };
  }
  return { body: html };
}

function usePrefersDark() {
  const [prefersDark, setPrefersDark] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => setPrefersDark(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return prefersDark;
}

export function LeadsQuiz({ form }: { form: PublicForm }) {
  const [bootstrapped, setBootstrapped] = useState(false);
  const [resumed, setResumed] = useState(false);
  const [phase, setPhase] = useState<Phase>("quiz");
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [bubbles, setBubbles] = useState<ChatBubble[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState<{ title: string; body: string } | null>(null);
  const [typing, setTyping] = useState(false);
  const [multiSelected, setMultiSelected] = useState<string[]>([]);
  const [redirectReady, setRedirectReady] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  const [flowSession, setFlowSession] = useState(0);
  const startedRef = useRef(false);
  const shownStepsRef = useRef<Set<number>>(new Set());
  const shownKeysRef = useRef<Set<string>>(new Set());
  const redirectOpenedRef = useRef(false);
  const answersRef = useRef(answers);
  const leadIdRef = useRef<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const anonId = useMemo(() => (typeof window !== "undefined" ? getAnonId() : ""), []);
  const prefersDark = usePrefersDark();
  const questions = form.questions;
  const current = questions[stepIndex];
  const progress = phase === "quiz" ? Math.min(stepIndex / Math.max(questions.length, 1), 1) : 1;
  answersRef.current = answers;
  leadIdRef.current = leadId;

  useEffect(() => {
    captureLeadUtm(form.slug);
  }, [form.slug]);

  const agentInitial = form.agentName.trim().slice(0, 1).toUpperCase() || "B";
  const primary = form.primaryColor || "#128C7E";
  const primaryDark = darkenHex(primary, 0.28);
  const themeStyle = {
    ["--sf-primary" as string]: primary,
    ["--sf-primary-dark" as string]: primaryDark,
    ["--sf-page-bg-light" as string]: form.pageBgLight || "#1A5C4F",
    ["--sf-page-bg-dark" as string]: form.pageBgDark || "#0B141A",
  };

  const activeWallpaper = prefersDark
    ? form.wallpaperDarkUrl || form.wallpaperUrl
    : form.wallpaperUrl || form.wallpaperDarkUrl;

  const wallpaperStyle = activeWallpaper
    ? {
        backgroundImage: `url(${activeWallpaper})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }
    : undefined;

  const whatsappHref = `https://wa.me/${form.whatsappDestination.replace(/\D/g, "")}?text=${encodeURIComponent(
    interpolate(form.whatsappMessage || "Olá!", answers),
  )}`;

  const persistProgress = useCallback(
    (patch: {
      answers: Record<string, string>;
      stepIndex: number;
      phase: Phase;
      leadId?: string | null;
      diagnosis?: { title: string; body: string } | null;
      bubbles: QuizProgressBubble[];
    }) => {
      if (patch.phase !== "diagnosis" && !hasRecoverableContact(patch.answers)) return;
      saveQuizProgress({
        v: 1,
        slug: form.slug,
        leadId: patch.leadId ?? leadIdRef.current,
        answers: patch.answers,
        stepIndex: patch.stepIndex,
        phase: patch.phase,
        diagnosis: patch.diagnosis ?? null,
        bubbles: patch.bubbles,
        shownSteps: Array.from(shownStepsRef.current),
        updatedAt: Date.now(),
        questionSignature: questionSignature(questions),
      });
    },
    [form.slug, questions],
  );

  useEffect(() => {
    const saved = restoreQuizProgress(form.slug, form.questions);
    if (saved) {
      setAnswers(saved.answers);
      setStepIndex(saved.stepIndex);
      setLeadId(saved.leadId);
      setBubbles(saved.bubbles || []);
      setPhase(saved.phase);
      setDiagnosis(saved.diagnosis);
      shownStepsRef.current = new Set(saved.shownSteps);
      shownKeysRef.current = new Set(
        saved.shownSteps.map((step) => `0:${step}`),
      );
      setResumed(saved.phase === "quiz");
    }
    setBootstrapped(true);
    // Só na montagem / troca de formulário — evita loop com nova referência de questions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.slug]);

  useEffect(() => {
    if (form.seoTitle && typeof document !== "undefined") {
      document.title = form.seoTitle;
    }
  }, [form.seoTitle]);

  useEffect(() => {
    if (!bootstrapped) return;
    if (form.tracking.gtmId) ensureGtm(form.tracking.gtmId);
    if (form.tracking.metaPixelId) ensureMetaPixel(form.tracking.metaPixelId);
    if (!startedRef.current) {
      startedRef.current = true;
      pushDataLayer("quiz_started", { form: form.slug, resumed });
    }
  }, [form, bootstrapped, resumed]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [bubbles, typing, phase, current]);

  const botDelayMs = form.botDelayMs || 850;

  const pushBotMessages = useCallback(
    async (messages: Array<{ html: string; isQuestion?: boolean }>) => {
      for (const msg of messages) {
        setTyping(true);
        await new Promise((r) => setTimeout(r, botDelayMs));
        setTyping(false);
        setBubbles((prev) => {
          const next = [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "bot" as const,
              html: formatBubbleHtml(msg.html, answersRef.current),
              isQuestion: msg.isQuestion,
              time: nowTime(),
            },
          ];
          if (hasRecoverableContact(answersRef.current)) {
            persistProgress({
              answers: answersRef.current,
              stepIndex,
              phase: "quiz",
              bubbles: next,
            });
          }
          return next;
        });
        await new Promise((r) => setTimeout(r, 120));
      }
    },
    [botDelayMs, persistProgress, stepIndex],
  );

  useEffect(() => {
    if (!bootstrapped || phase !== "quiz" || !current) return;
    const shownKey = `${flowSession}:${stepIndex}`;
    if (shownKeysRef.current.has(shownKey)) return;
    shownKeysRef.current.add(shownKey);
    shownStepsRef.current.add(stepIndex);
    let cancelled = false;
    (async () => {
      const botMsgs = current.botMessages || [];
      const msgs = botMsgs.map((html) => ({ html, isQuestion: false as boolean }));
      const prompt = current.prompt?.trim();
      const alreadyInBot = prompt ? botMsgs.some((m) => m.trim() === prompt) : false;
      if (prompt && !alreadyInBot) {
        msgs.push({ html: prompt, isQuestion: true });
      } else if (msgs.length > 0 && prompt && alreadyInBot) {
        const lastIdx = msgs.length - 1;
        if (msgs[lastIdx].html.trim() === prompt) {
          msgs[lastIdx] = { ...msgs[lastIdx], isQuestion: true };
        }
      }
      if (!cancelled && msgs.length) await pushBotMessages(msgs);
      if (!cancelled && current.type === "redirect") {
        setRedirectReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bootstrapped, flowSession, stepIndex, phase, current, pushBotMessages]);

  useEffect(() => {
    if (!bootstrapped) return;
    setMultiSelected([]);
    setInput("");
    setError(null);
    setRedirectReady(false);
    setRedirectCountdown(null);
    redirectOpenedRef.current = false;
  }, [stepIndex, bootstrapped]);

  const trackingMeta = () => ({
    fbp: resolveFbp(),
    fbc: resolveFbc(),
    sourceUrl: typeof window !== "undefined" ? window.location.href : undefined,
    utm: captureLeadUtm(form.slug),
    anonId,
  });

  const finishQuiz = async (
    nextAnswers: Record<string, string>,
    nextBubbles: ChatBubble[],
  ) => {
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
      pushDataLayer("quiz_complete", {
        lead_id: result.leadId,
        event_id: result.eventId,
        score: result.score,
        qualified: result.qualified,
        threshold: form.qualificationThreshold,
      });
      if (result.qualified) {
        pushDataLayer("quiz_lead", {
          lead_id: result.leadId,
          event_id: result.eventId,
          score: result.score,
          qualified: true,
        });
        trackPixel("Lead", { content_name: form.slug, value: result.score }, result.eventId);
      }
      setPhase("diagnosis");
      persistProgress({
        answers: nextAnswers,
        stepIndex,
        phase: "diagnosis",
        leadId: result.leadId,
        diagnosis: result.diagnosis,
        bubbles: nextBubbles,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o lead.");
    } finally {
      setBusy(false);
    }
  };

  const advance = async (value: string, optionNextKey?: string | null) => {
    if (!current || busy) return;
    const err = validateAnswer(current, value);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setResumed(false);
    const trimmedValue = value.trim();
    const dateParsed = current.type === "date" ? parseLeadDate(trimmedValue) : null;
    const displayValue =
      current.type === "date" && dateParsed
        ? formatLeadDateBr(dateParsed.iso)
        : trimmedValue || (isContentOnlyType(current.type) ? "Continuar" : "");
    const stored =
      isContentOnlyType(current.type)
        ? current.type === "redirect"
          ? current.placeholder || "redirect"
          : "ok"
        : current.type === "date" && dateParsed
          ? formatLeadDateBr(dateParsed.iso)
          : trimmedValue;
    const nextAnswers = { ...answers, [current.key]: stored };
    const userBubble: ChatBubble = {
      id: crypto.randomUUID(),
      role: "user",
      text: displayValue,
      time: nowTime(),
    };
    const nextBubbles = [...bubbles, userBubble];
    setAnswers(nextAnswers);
    setBubbles(nextBubbles);
    setInput("");
    setMultiSelected([]);

    if (current.type === "redirect" && current.placeholder?.trim()) {
      if (!redirectOpenedRef.current) {
        redirectOpenedRef.current = true;
        const url = resolveRedirectUrl(current.placeholder.trim(), nextAnswers);
        window.open(url, "_blank", "noopener,noreferrer");
      }
    }

    let nextLeadId = leadId;
    const phone =
      nextAnswers.whatsapp ||
      ((current.key === "whatsapp" || current.type === "tel") ? stored : "");
    const shouldUpsertPartial =
      Boolean(phone && phone.trim().length >= 8) &&
      (current.key === "whatsapp" ||
        current.type === "tel" ||
        (hasRecoverableContact(nextAnswers) && Boolean(leadId)));

    if (shouldUpsertPartial && phone) {
      setBusy(true);
      try {
        const partial = await upsertLeadPartialFn({
          data: {
            slug: form.slug,
            leadId: leadId || undefined,
            name: nextAnswers.nome,
            email: nextAnswers.email,
            whatsapp: phone,
            answers: nextAnswers,
            ...trackingMeta(),
          },
        });
        nextLeadId = partial.leadId;
        setLeadId(partial.leadId);
        pushDataLayer("quiz_partial", { lead_id: partial.leadId });
      } catch (e) {
        if (current.key === "whatsapp" || current.type === "tel") {
          setError(e instanceof Error ? e.message : "Erro ao salvar contato.");
          setBusy(false);
          return;
        }
      } finally {
        setBusy(false);
      }
    }

    const branchKey = optionNextKey || current.nextKey;
    const next = resolveNextStepIndex(questions, stepIndex, branchKey);
    if (next === "end") {
      persistProgress({
        answers: nextAnswers,
        stepIndex,
        phase: "quiz",
        leadId: nextLeadId,
        bubbles: nextBubbles,
      });
      await finishQuiz(nextAnswers, nextBubbles);
      return;
    }

    persistProgress({
      answers: nextAnswers,
      stepIndex: next,
      phase: "quiz",
      leadId: nextLeadId,
      bubbles: nextBubbles,
    });
    setStepIndex(next);
  };

  const advanceRef = useRef(advance);
  advanceRef.current = advance;

  useEffect(() => {
    if (!redirectReady || phase !== "quiz" || !current || current.type !== "redirect" || busy) {
      return;
    }
    if (!current.placeholder?.trim()) return;

    const delaySec = Math.max(0, current.redirectDelaySec ?? 3);
    if (delaySec <= 0) {
      void advanceRef.current("ok");
      return;
    }

    let remaining = delaySec;
    setRedirectCountdown(remaining);
    const tick = window.setInterval(() => {
      remaining -= 1;
      setRedirectCountdown(remaining);
      if (remaining <= 0) {
        window.clearInterval(tick);
        void advanceRef.current("ok");
      }
    }, 1000);

    return () => window.clearInterval(tick);
  }, [redirectReady, phase, current, busy]);

  const restartFromScratch = () => {
    if (!window.confirm("Apagar o progresso salvo neste navegador e começar de novo?")) return;
    clearQuizProgress(form.slug);
    shownStepsRef.current = new Set();
    shownKeysRef.current = new Set();
    setFlowSession((s) => s + 1);
    setAnswers({});
    setBubbles([]);
    setStepIndex(0);
    setLeadId(null);
    setDiagnosis(null);
    setPhase("quiz");
    setResumed(false);
    setError(null);
    setInput("");
    setMultiSelected([]);
    setRedirectReady(false);
    setRedirectCountdown(null);
  };
  const showSingleChoice =
    phase === "quiz" &&
    current &&
    (current.type === "choice" ||
      current.type === "buttons" ||
      current.type === "scale" ||
      current.type === "rating") &&
    !typing &&
    !busy;
  const showMulti =
    phase === "quiz" && current?.type === "multi" && !typing && !busy;
  const showRedirectAction =
    phase === "quiz" && current?.type === "redirect" && redirectReady && !typing && !busy;
  const showMediaAction =
    phase === "quiz" && current?.type === "media" && !typing && !busy;
  const showContentAction =
    phase === "quiz" &&
    current &&
    current.type !== "redirect" &&
    current.type !== "media" &&
    (isContentOnlyType(current.type) || current.type === "lgpd" || current.type === "confirm") &&
    !typing &&
    !busy;
  const currentMedia = current ? resolveQuestionMedia(current) : null;
  const showTextInput =
    phase === "quiz" &&
    current &&
    !hasChoiceOptions(current.type) &&
    !isContentOnlyType(current.type) &&
    current.type !== "lgpd" &&
    current.type !== "confirm" &&
    !typing;

  if (!bootstrapped) {
    return (
      <div className="leads-quiz-app sf-root sf-page-frame-light" style={themeStyle}>
        <div className="sf-phone">
          <header className="sf-header">
            <div className="sf-avatar">{agentInitial}</div>
            <div className="sf-header-text">
              <div className="sf-header-name">{form.agentName}</div>
              <div className="sf-header-sub">Carregando…</div>
            </div>
          </header>
          <div className="sf-body">
            <div className="sf-wallpaper" aria-hidden style={wallpaperStyle} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="leads-quiz-app sf-root sf-page-frame-light" style={themeStyle}>
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
              {form.headerSubtitle || form.agentTitle || "diagnóstico online"}
              {form.brandName ? ` · ${form.brandName}` : ""}
            </div>
          </div>
          <div className="sf-progress" aria-hidden>
            <i style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        </header>

        <div className="sf-body">
          <div className="sf-wallpaper" aria-hidden style={wallpaperStyle} />
          <div ref={listRef} className="sf-scroll">
            <div className="sf-date-chip">Hoje</div>

            {resumed ? (
              <div className="sf-resume-banner" role="status">
                Continuamos de onde você parou
                <button type="button" className="sf-resume-reset" onClick={restartFromScratch}>
                  Começar de novo
                </button>
              </div>
            ) : null}

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

              const html = b.html || "";
              const parsed = stripHtmlToTitleBody(html);
              return (
                <div key={b.id} className="sf-row">
                  <div className="sf-bubble-bot">
                    {b.isQuestion || !parsed.title ? (
                      <span dangerouslySetInnerHTML={{ __html: html }} />
                    ) : (
                      <>
                        <div className="font-semibold">{parsed.title}</div>
                        <div
                          className="sf-bubble-body"
                          dangerouslySetInnerHTML={{
                            __html: formatLeadMessageHtml(parsed.body),
                          }}
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

            {showSingleChoice && current && (
              <div className="sf-options">
                {current.options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className="sf-option"
                    disabled={busy}
                    onClick={() => advance(opt.label, opt.nextKey)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {showMulti && current && (
              <div className="sf-options">
                {current.options.map((opt) => {
                  const on = multiSelected.includes(opt.label);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      className={`sf-option${on ? " selected" : ""}`}
                      disabled={busy}
                      onClick={() =>
                        setMultiSelected((prev) =>
                          on ? prev.filter((x) => x !== opt.label) : [...prev, opt.label],
                        )
                      }
                    >
                      {on ? "✓ " : ""}
                      {opt.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  className="sf-cta"
                  disabled={busy || multiSelected.length === 0}
                  onClick={() => advance(multiSelected.join(" | "))}
                >
                  Confirmar seleção
                </button>
              </div>
            )}

            {showMediaAction && current && (
              <div className="sf-options">
                {currentMedia ? (
                  <LeadMediaView kind={currentMedia.kind} url={currentMedia.url} />
                ) : (
                  <p className="sf-lgpd-links">Mídia não configurada.</p>
                )}
                <button
                  type="button"
                  className="sf-cta"
                  disabled={busy}
                  onClick={() => advance("ok")}
                >
                  Continuar
                </button>
              </div>
            )}

            {showRedirectAction && current && (
              <div className="sf-options">
                {redirectCountdown != null && redirectCountdown > 0 ? (
                  <p className="sf-lgpd-links">Abrindo em {redirectCountdown}s…</p>
                ) : null}
                <button
                  type="button"
                  className="sf-cta"
                  disabled={busy}
                  onClick={() => advance("ok")}
                >
                  Abrir agora
                </button>
              </div>
            )}

            {showContentAction && current && (
              <div className="sf-options">
                {current.type === "lgpd" ? (
                  <>
                    <p className="sf-lgpd-links">
                      {form.privacyUrl ? (
                        <a href={form.privacyUrl} target="_blank" rel="noreferrer">
                          Política de privacidade
                        </a>
                      ) : null}
                      {form.termsUrl ? (
                        <>
                          {" · "}
                          <a href={form.termsUrl} target="_blank" rel="noreferrer">
                            Termos
                          </a>
                        </>
                      ) : null}
                    </p>
                    <button
                      type="button"
                      className="sf-option"
                      disabled={busy}
                      onClick={() => advance("sim")}
                    >
                      Aceito continuar
                    </button>
                  </>
                ) : current.type === "confirm" ? (
                  <button
                    type="button"
                    className="sf-cta"
                    disabled={busy}
                    onClick={() => advance("confirmado")}
                  >
                    Confirmar
                  </button>
                ) : (
                  <button
                    type="button"
                    className="sf-cta"
                    disabled={busy}
                    onClick={() => advance("ok")}
                  >
                    Continuar
                  </button>
                )}
              </div>
            )}

            {phase === "diagnosis" && diagnosis && (
              <div className="sf-card">
                <h4>Diagnóstico</h4>
                <strong
                  dangerouslySetInnerHTML={{
                    __html: formatBubbleHtml(diagnosis.title, answers),
                  }}
                />
                <p
                  dangerouslySetInnerHTML={{
                    __html: formatBubbleHtml(diagnosis.body, answers),
                  }}
                />
                <a className="sf-cta wa" href={whatsappHref} target="_blank" rel="noreferrer">
                  Falar no WhatsApp
                </a>
                <button type="button" className="sf-restart-link" onClick={restartFromScratch}>
                  Preencher de novo
                </button>
              </div>
            )}
          </div>

          {showTextInput && current && (
            <div className="sf-composer">
              {error && <p className="sf-error">{error}</p>}
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
                        : current.type === "number"
                          ? "number"
                          : current.type === "tel"
                            ? "tel"
                            : "text"
                    }
                    inputMode={current.type === "date" ? "numeric" : undefined}
                    autoComplete={current.type === "date" ? "off" : undefined}
                    value={input}
                    placeholder={
                      current.type === "date"
                        ? "dd/mm/aaaa"
                        : current.placeholder || "Digite sua resposta…"
                    }
                    maxLength={current.type === "date" ? 10 : undefined}
                    disabled={busy || typing}
                    onChange={(e) => {
                      const v =
                        current.type === "tel"
                          ? formatPhoneMask(e.target.value)
                          : current.type === "date"
                            ? formatDateMaskBr(e.target.value)
                            : e.target.value;
                      setInput(v);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        advance(input);
                      }
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
