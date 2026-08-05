export const LEAD_INTENT_VALUES = ["evento", "parceria", "trabalhe_conosco"] as const;
export type LeadIntentValue = (typeof LEAD_INTENT_VALUES)[number];

export const LEAD_INTENT_LABEL: Record<LeadIntentValue, string> = {
  evento: "💍 Evento",
  parceria: "🤝 Parceria",
  trabalhe_conosco: "👥 Trabalhe Conosco",
};

/**
 * Deriva a intenção do lead a partir das respostas do quiz. Os fluxos de
 * parceria/trabalhe-conosco usam chaves de bloco prefixadas ("parceria_"/
 * "equipe_"), o que é o sinal mais confiável; como fallback (ex.: lead que
 * escolheu o ramo mas ainda não respondeu nenhum bloco dele), olha a
 * resposta do bloco de ramificação ("Procura").
 */
export function computeLeadIntent(answers: Record<string, unknown>): LeadIntentValue {
  const keys = Object.keys(answers);
  if (keys.some((k) => k.startsWith("parceria_"))) return "parceria";
  if (keys.some((k) => k.startsWith("equipe_"))) return "trabalhe_conosco";

  const branchAnswer = String(answers["Procura"] || "").toLowerCase();
  if (branchAnswer.includes("parceir")) return "parceria";
  if (branchAnswer.includes("equipe") || branchAnswer.includes("trabalhar conosco")) {
    return "trabalhe_conosco";
  }
  return "evento";
}
