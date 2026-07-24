/** Tipos de bloco do formulário de leads (paridade Ativa, sem CPF/CNPJ/cidade/estado/hora). */
export const LEAD_QUESTION_TYPES = [
  "text",
  "email",
  "tel",
  "number",
  "date",
  "choice",
  "buttons",
  "multi",
  "scale",
  "rating",
  "message",
  "confirm",
  "redirect",
  "lgpd",
] as const;

export type LeadQuestionTypeValue = (typeof LEAD_QUESTION_TYPES)[number];

/** Sentinel: encerra o quiz e vai ao diagnóstico. */
export const FLOW_END = "__end__";

export const TYPE_LABEL: Record<LeadQuestionTypeValue, string> = {
  text: "Texto",
  email: "E-mail",
  tel: "Telefone",
  number: "Número",
  date: "Data",
  choice: "Seleção única",
  buttons: "Botões",
  multi: "Seleção múltipla",
  scale: "Escala",
  rating: "Nota",
  message: "Mensagem",
  confirm: "Confirmação",
  redirect: "Redirecionamento",
  lgpd: "Aceite LGPD",
};

export type BlockMenuItem = {
  type: LeadQuestionTypeValue;
  label: string;
  hint?: string;
};

export const BLOCK_MENU: Array<{ section: string; items: BlockMenuItem[] }> = [
  {
    section: "Conteúdo",
    items: [
      { type: "message", label: "Mensagem", hint: "Só texto do bot" },
      { type: "confirm", label: "Confirmação", hint: "Revisar e confirmar" },
      { type: "redirect", label: "Redirecionamento", hint: "Abrir URL" },
      { type: "lgpd", label: "Aceite LGPD", hint: "Privacidade / termos" },
    ],
  },
  {
    section: "Campos",
    items: [
      { type: "text", label: "Texto" },
      { type: "email", label: "E-mail" },
      { type: "tel", label: "Telefone" },
      { type: "number", label: "Número" },
      { type: "date", label: "Data" },
    ],
  },
  {
    section: "Escolhas",
    items: [
      { type: "choice", label: "Seleção única" },
      { type: "multi", label: "Seleção múltipla" },
      { type: "buttons", label: "Botões" },
      { type: "scale", label: "Escala" },
      { type: "rating", label: "Nota" },
    ],
  },
];

export function hasChoiceOptions(type: string) {
  return type === "choice" || type === "buttons" || type === "multi" || type === "scale" || type === "rating";
}

export function isContentOnlyType(type: string) {
  return type === "message" || type === "confirm" || type === "redirect";
}

export function needsAnswer(type: string, required: boolean) {
  if (isContentOnlyType(type)) return false;
  if (type === "lgpd") return required;
  return required;
}

export function defaultPromptForType(type: LeadQuestionTypeValue) {
  switch (type) {
    case "message":
      return "";
    case "confirm":
      return "Confere se está tudo certo?";
    case "redirect":
      return "Vou te redirecionar agora.";
    case "lgpd":
      return "Você aceita a política de privacidade para continuar?";
    case "number":
      return "Qual o número?";
    case "multi":
      return "Pode escolher mais de uma opção:";
    case "scale":
      return "De 1 a 5, como avalia?";
    case "rating":
      return "Que nota você dá?";
    case "buttons":
    case "choice":
      return "Escolha uma opção:";
    default:
      return "Nova pergunta";
  }
}

export function defaultOptionsForType(type: LeadQuestionTypeValue) {
  if (type === "scale" || type === "rating") {
    return [1, 2, 3, 4, 5].map((n, i) => ({
      label: String(n),
      score_points: n * 4,
      sort_order: i,
      active: true,
      next_key: "",
    }));
  }
  if (hasChoiceOptions(type)) {
    return [
      { label: "Opção A", score_points: 10, sort_order: 0, active: true, next_key: "" },
      { label: "Opção B", score_points: 20, sort_order: 1, active: true, next_key: "" },
    ];
  }
  return [];
}

/** Resolve o próximo índice do fluxo (ou fim). */
export function resolveNextStepIndex(
  questions: Array<{ key: string }>,
  currentIndex: number,
  nextKey: string | null | undefined,
): number | "end" {
  const key = (nextKey || "").trim();
  if (key === FLOW_END) return "end";
  if (!key) {
    const next = currentIndex + 1;
    return next >= questions.length ? "end" : next;
  }
  const idx = questions.findIndex((q) => q.key === key);
  if (idx < 0) {
    const next = currentIndex + 1;
    return next >= questions.length ? "end" : next;
  }
  return idx;
}
