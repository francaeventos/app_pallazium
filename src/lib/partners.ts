export const PARTNERSHIP_TYPE_OPTIONS = [
  "Sou fornecedor de produtos",
  "Sou fornecedor de serviços",
  "Trabalho com eventos",
  "Marketing / divulgação / influenciador",
  "Tenho uma empresa e gostaria de desenvolver uma parceria",
  "Outra proposta",
] as const;

export const PARTNER_STATUS_LABEL: Record<string, string> = {
  novo: "Novo",
  em_analise: "Em análise",
  contatado: "Contatado",
  descartado: "Descartado",
};

export function partnersContactEmail() {
  return (
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_PARTNERSHIP_EMAIL) ||
    "contato@espacopallazium.com.br"
  );
}
