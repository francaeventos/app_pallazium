export const CAREERS_ROLE_OPTIONS = [
  "Garçom / Garçonete",
  "Cozinha",
  "Copa",
  "Limpeza",
  "Recepção",
  "Segurança",
  "DJ / Técnico",
  "Assessoria / Cerimonial",
  "Montagem / Produção",
  "Outra",
] as const;

export const CAREERS_AVAILABILITY_OPTIONS = [
  "Sexta-feira à noite",
  "Sábado durante o dia",
  "Sábado à noite",
  "Domingo durante o dia",
  "Domingo à noite",
  "Dias de semana",
  "Disponibilidade variável",
] as const;

export const CAREERS_STATUS_LABEL: Record<string, string> = {
  novo: "Novo",
  em_analise: "Em análise",
  contatado: "Contatado",
  descartado: "Descartado",
};

export function careersContactEmail() {
  return (
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_CAREERS_EMAIL) ||
    "trabalheconosco@espacopallazium.com.br"
  );
}
