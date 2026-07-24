/** Interpola {{chave}} e legado {chave} com respostas / campos fixos. */
export function interpolateLeadTemplate(
  template: string,
  vars: Record<string, string | null | undefined>,
) {
  if (!template) return "";
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(vars)) {
    if (value == null) continue;
    normalized[key.toLowerCase()] = String(value);
  }

  const lookup = (rawKey: string) => {
    const key = rawKey.trim().toLowerCase();
    if (key === "br") return "\n";
    return normalized[key] ?? "";
  };

  return template
    .replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => lookup(key))
    .replace(/\{\s*([a-zA-Z0-9_]+)\s*\}/g, (_, key: string) => lookup(key));
}

export function buildLeadTemplateVars(answers: Record<string, string>) {
  const vars: Record<string, string> = { ...answers };
  if (answers.nome) vars.nome = answers.nome;
  if (answers.whatsapp) {
    vars.telefone = answers.whatsapp;
    vars.whatsapp = answers.whatsapp;
  }
  if (answers.email) vars.email = answers.email;
  if (answers.tipoEvento) {
    vars.tipoEvento = answers.tipoEvento;
    vars.tipoevento = answers.tipoEvento;
  }
  if (answers.dataEvento) {
    vars.dataEvento = answers.dataEvento;
    vars.dataevento = answers.dataEvento;
  }
  return vars;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Converte marcadores de negrito para HTML seguro.
 * Aceita *texto* (WhatsApp), **texto** e <b>texto</b> legado.
 */
export function formatLeadMessageHtml(text: string) {
  if (!text) return "";
  let s = text.replace(/\r\n/g, "\n");
  s = s.replace(/<\/?b>/gi, (tag) => (tag.toLowerCase() === "<b>" ? "§B§" : "§/B§"));
  s = s.replace(/<\/?strong>/gi, (tag) =>
    tag.toLowerCase().startsWith("<strong") ? "§B§" : "§/B§",
  );
  s = s.replace(/\*\*([^*\n]+)\*\*/g, "§B§$1§/B§");
  s = s.replace(/(^|[^*\w])\*([^*\n]+)\*(?!\*)/g, "$1§B§$2§/B§");
  s = escapeHtml(s);
  s = s.replace(/§B§/g, "<b>").replace(/§\/B§/g, "</b>");
  s = s.replace(/\n/g, "<br/>");
  return s;
}

/** Envolve a seleção (ou o texto) com *negrito*. */
export function wrapWithBoldMarkers(value: string, start: number, end: number) {
  const selected = value.slice(start, end);
  if (!selected) {
    const insert = "*negrito*";
    return {
      value: value.slice(0, start) + insert + value.slice(end),
      selectionStart: start + 1,
      selectionEnd: start + insert.length - 1,
    };
  }
  const wrapped = `*${selected}*`;
  return {
    value: value.slice(0, start) + wrapped + value.slice(end),
    selectionStart: start,
    selectionEnd: start + wrapped.length,
  };
}

export const CORE_VARIABLE_CHIPS = [
  { token: "{{nome}}", label: "nome" },
  { token: "{{telefone}}", label: "telefone" },
  { token: "{{email}}", label: "email" },
  { token: "{{tipoEvento}}", label: "tipo evento" },
  { token: "{{dataEvento}}", label: "data evento" },
  { token: "{{br}}", label: "quebra de linha" },
] as const;

const VARIABLE_LABELS: Record<string, string> = {
  nome: "nome",
  telefone: "telefone",
  whatsapp: "whatsapp",
  email: "email",
  tipoEvento: "tipo evento",
  dataEvento: "data evento",
  convidados: "convidados",
  investimento: "investimento",
  br: "quebra de linha",
};

/** Chips fixos + variáveis do fluxo (chaves dos blocos). */
export function buildFlowVariableChips(questionKeys: string[]) {
  const seen = new Set<string>();
  const chips: Array<{ token: string; label: string }> = [];

  const push = (key: string, label?: string) => {
    const normalized = key.trim();
    if (!normalized || seen.has(normalized.toLowerCase())) return;
    seen.add(normalized.toLowerCase());
    chips.push({
      token: `{{${normalized}}}`,
      label: label || VARIABLE_LABELS[normalized] || normalized,
    });
  };

  for (const chip of CORE_VARIABLE_CHIPS) {
    const key = chip.token.replace(/^\{\{|\}\}$/g, "");
    push(key, chip.label);
  }

  for (const key of questionKeys) {
    if (!key || key.startsWith("bloco_")) continue;
    push(key);
  }

  return chips;
}

/** Monta URL de redirect com variáveis ({{br}} → %0A para WhatsApp). */
export function resolveRedirectUrl(
  template: string,
  answers: Record<string, string>,
) {
  const raw = interpolateLeadTemplate(template, buildLeadTemplateVars(answers));
  return raw.replace(/\r?\n/g, "%0A");
}

/** Modelo pronto de link WhatsApp (Ativa Dash). */
export function defaultWhatsAppRedirectTemplate(phoneDigits: string) {
  const phone = phoneDigits.replace(/\D/g, "") || "5511999999999";
  return `https://wa.me/${phone}?text=Olá, eu sou {{nome}} e preciso de um orçamento.{{br}}Tipo: {{tipoEvento}}{{br}}Data: {{dataEvento}}{{br}}Telefone: {{telefone}}{{br}}E-mail: {{email}}`;
}
