import type { PriorityLevel } from "@/generated/prisma/client";

export type ChecklistTemplateItem = {
  title: string;
  description?: string;
  priority: PriorityLevel;
};

export const DEFAULT_CHECKLIST: ChecklistTemplateItem[] = [
  { title: "Contrato fechado", priority: "alta" },
  { title: "Data confirmada", priority: "alta" },
  { title: "Local confirmado", priority: "alta" },
  { title: "Quantidade de convidados", priority: "alta" },
  { title: "Horário de início", priority: "alta" },
  { title: "Horário de encerramento", priority: "alta" },
  { title: "Cardápio escolhido", priority: "media" },
  { title: "Bebidas definidas", priority: "media" },
  { title: "Decoração definida", priority: "media" },
  { title: "Mesa principal definida", priority: "media" },
  { title: "Bolo escolhido", priority: "media" },
  { title: "Doces definidos", priority: "media" },
  { title: "Música ou DJ definido", priority: "media" },
  { title: "Som e iluminação definidos", priority: "media" },
  { title: "Fotógrafo definido", priority: "media" },
  { title: "Filmagem definida", priority: "media" },
  { title: "Cerimonial ou assessoria", priority: "baixa" },
  { title: "Recepção", priority: "baixa" },
  { title: "Segurança", priority: "baixa" },
  { title: "Lembrancinhas", priority: "baixa" },
  { title: "Cronograma do evento", priority: "baixa" },
  { title: "Observações especiais", priority: "baixa" },
];

export const BRIDE_CHECKLIST: ChecklistTemplateItem[] = [
  {
    title: "Data, horário e cerimônia confirmados",
    description:
      "Confirmar data, horário, formato da cerimônia e tempo previsto entre cerimônia e festa.",
    priority: "alta",
  },
  {
    title: "Contrato e escopo do evento revisados",
    description:
      "Revisar o que está incluso, prazos de pagamento, quantidade de convidados e observações especiais.",
    priority: "alta",
  },
  {
    title: "Lista final de convidados",
    description:
      "Enviar quantidade estimada e depois a lista final para ajustes de layout, equipe e gastronomia.",
    priority: "alta",
  },
  {
    title: "Identidade visual do casamento",
    description:
      "Definir paleta de cores, estilo, referências e clima desejado para orientar decoração e papelaria.",
    priority: "alta",
  },
  {
    title: "Cerimonial ou assessoria alinhados",
    description:
      "Informar contato da assessoria/cerimonial e alinhar responsabilidades no dia do evento.",
    priority: "alta",
  },
  {
    title: "Cronograma premium do dia da noiva",
    description:
      "Organizar horários de making of, fotos, chegada da noiva, entrada, jantar, pista e encerramento.",
    priority: "alta",
  },
  {
    title: "Layout da cerimônia e recepção",
    description:
      "Definir posicionamento de altar, mesa principal, pista, lounges, doces, bar e circulação dos convidados.",
    priority: "media",
  },
  {
    title: "Decoração floral e mobiliário",
    description:
      "Validar flores, arranjos, mobiliário, peças decorativas e pontos especiais de foto.",
    priority: "media",
  },
  {
    title: "Mesa do bolo e doces",
    description:
      "Definir bolo, doces, forminhas, suportes, flores, iluminação e montagem da mesa principal.",
    priority: "media",
  },
  {
    title: "Cardápio da festa",
    description: "Escolher menu, restrições alimentares, degustação e preferências de serviço.",
    priority: "media",
  },
  {
    title: "Bebidas, bar e brinde",
    description:
      "Alinhar carta de bebidas, espumante do brinde, bar, água para pista e reposições.",
    priority: "media",
  },
  {
    title: "Música da cerimônia",
    description: "Definir músicas de entrada dos padrinhos, noivo, noiva, alianças e saída.",
    priority: "media",
  },
  {
    title: "DJ, banda e pista",
    description:
      "Confirmar repertório, briefing musical, primeira dança, momentos especiais e restrições.",
    priority: "media",
  },
  {
    title: "Foto e vídeo",
    description:
      "Enviar contatos, horários, lista de fotos obrigatórias e pontos de destaque do espaço.",
    priority: "media",
  },
  {
    title: "Entrada da noiva",
    description: "Validar percurso, música, iluminação, porta/entrada, timing e equipe envolvida.",
    priority: "alta",
  },
  {
    title: "Padrinhos, daminhas e pajens",
    description:
      "Confirmar quantidade, ordem de entrada, lugares reservados e qualquer necessidade especial.",
    priority: "media",
  },
  {
    title: "Vestido, acessórios e cuidados",
    description:
      "Registrar necessidades de espaço para vestido, troca, retoques, buquê e itens pessoais.",
    priority: "baixa",
  },
  {
    title: "Buquê e lapelas",
    description: "Definir buquê principal, buquê para jogar, lapelas e horários de entrega.",
    priority: "baixa",
  },
  {
    title: "Lembrancinhas e itens personalizados",
    description: "Confirmar entrega, quantidade, montagem, local de exposição e distribuição.",
    priority: "baixa",
  },
  {
    title: "Plano de chuva ou contingência",
    description:
      "Alinhar alternativas de cerimônia, fotos, recepção e circulação caso o clima mude.",
    priority: "alta",
  },
  {
    title: "Checklist final da semana do casamento",
    description:
      "Revisar fornecedores, horários, pagamentos, objetos pessoais, documentos e contatos essenciais.",
    priority: "alta",
  },
  {
    title: "Briefing final com equipe Pallazium",
    description:
      "Confirmar todos os detalhes finais, pendências, observações da noiva e prioridades do evento.",
    priority: "alta",
  },
];

export function checklistTemplateForEvent(eventType: string): ChecklistTemplateItem[] {
  const normalized = eventType.toLowerCase();
  if (
    normalized.includes("casamento") ||
    normalized.includes("noiva") ||
    normalized.includes("wedding")
  ) {
    return BRIDE_CHECKLIST;
  }
  return DEFAULT_CHECKLIST;
}
