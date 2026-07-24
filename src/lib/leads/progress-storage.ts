export type QuizProgressBubble = {
  id: string;
  role: "bot" | "user";
  html?: string;
  text?: string;
  isQuestion?: boolean;
  time: string;
};

export type QuizProgressSnapshot = {
  v: 1;
  slug: string;
  leadId: string | null;
  answers: Record<string, string>;
  stepIndex: number;
  phase: "quiz" | "closing" | "diagnosis";
  diagnosis: { title: string; body: string } | null;
  closing?: {
    title: string;
    body: string;
    url: string;
    delaySec: number;
  } | null;
  bubbles: QuizProgressBubble[];
  shownSteps: number[];
  updatedAt: number;
  questionSignature: string;
};

type QuestionLike = { key: string; type: string };

const STORAGE_PREFIX = "pallazium_lead_progress:";

function storageKey(slug: string) {
  return `${STORAGE_PREFIX}${slug}`;
}

export function questionSignature(questions: QuestionLike[]) {
  return questions.map((q) => `${q.key}:${q.type}`).join("|");
}

/** Nome + (WhatsApp ou e-mail) — a partir daí vale recuperar o progresso. */
export function hasRecoverableContact(answers: Record<string, string>) {
  const nome = answers.nome?.trim() || "";
  const phone = answers.whatsapp?.trim() || "";
  const email = answers.email?.trim() || "";
  const hasName = nome.length >= 2;
  const hasPhone = phone.length >= 8;
  const hasEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  return hasName && (hasPhone || hasEmail);
}

export function loadQuizProgress(slug: string): QuizProgressSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QuizProgressSnapshot;
    if (!parsed || parsed.v !== 1 || parsed.slug !== slug) return null;
    if (!parsed.answers || typeof parsed.answers !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveQuizProgress(snapshot: QuizProgressSnapshot) {
  if (typeof window === "undefined") return;
  if (
    !hasRecoverableContact(snapshot.answers) &&
    snapshot.phase !== "diagnosis" &&
    snapshot.phase !== "closing"
  ) {
    return;
  }
  try {
    localStorage.setItem(
      storageKey(snapshot.slug),
      JSON.stringify({ ...snapshot, updatedAt: Date.now() }),
    );
  } catch {
    // quota / private mode
  }
}

export function clearQuizProgress(slug: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(storageKey(slug));
  } catch {
    // ignore
  }
}

/**
 * Restaura progresso válido. Se o formulário mudou, reposiciona no
 * primeiro bloco ainda sem resposta.
 */
export function restoreQuizProgress(
  slug: string,
  questions: QuestionLike[],
): QuizProgressSnapshot | null {
  const saved = loadQuizProgress(slug);
  if (!saved) return null;
  if (!hasRecoverableContact(saved.answers) && saved.phase !== "diagnosis" && saved.phase !== "closing") {
    clearQuizProgress(slug);
    return null;
  }

  const signature = questionSignature(questions);
  let stepIndex = saved.stepIndex;
  let phase = saved.phase;
  let shownSteps = Array.isArray(saved.shownSteps) ? [...saved.shownSteps] : [];

  if (saved.questionSignature !== signature) {
    const firstUnanswered = questions.findIndex((q) => {
      const value = saved.answers[q.key];
      return value == null || String(value).trim() === "";
    });
    if (firstUnanswered < 0) {
      phase = saved.phase === "quiz" ? "closing" : saved.phase;
      if (phase === "diagnosis") phase = "closing";
      stepIndex = Math.max(questions.length - 1, 0);
    } else {
      phase = "quiz";
      stepIndex = firstUnanswered;
    }
    shownSteps = Array.from({ length: stepIndex }, (_, i) => i);
  } else {
    stepIndex = Math.min(Math.max(0, stepIndex), Math.max(questions.length - 1, 0));
  }

  return {
    ...saved,
    stepIndex,
    phase,
    shownSteps,
    questionSignature: signature,
  };
}
