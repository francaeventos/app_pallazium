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

export const CORE_VARIABLE_CHIPS = [
  { token: "{{nome}}", label: "nome" },
  { token: "{{telefone}}", label: "telefone" },
  { token: "{{email}}", label: "email" },
  { token: "{{br}}", label: "quebra de linha" },
] as const;
