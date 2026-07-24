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
  { token: "{{br}}", label: "quebra de linha" },
] as const;
