export type DiagnosisRule = {
  title: string;
  body: string;
  matchKey: string | null;
  matchValue: string | null;
  isFallback: boolean;
  sortOrder: number;
};

export function resolveDiagnosis(
  answers: Record<string, string>,
  rules: DiagnosisRule[],
): { title: string; body: string } {
  const ordered = [...rules].sort((a, b) => a.sortOrder - b.sortOrder);
  for (const rule of ordered) {
    if (rule.isFallback) continue;
    if (!rule.matchKey) continue;
    if (answers[rule.matchKey] === rule.matchValue) {
      return { title: rule.title, body: rule.body };
    }
  }
  const fallback = ordered.find((r) => r.isFallback) ?? ordered[ordered.length - 1];
  if (fallback) return { title: fallback.title, body: fallback.body };
  return {
    title: "Uma proposta sob medida",
    body: "Com base no que você compartilhou, montamos um caminho personalizado para o seu evento. Vamos alinhar os detalhes numa degustação.",
  };
}
