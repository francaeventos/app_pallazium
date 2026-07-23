export type ScoreOption = {
  id: string;
  label: string;
  scorePoints: number;
};

export type ScoreQuestion = {
  key: string;
  type: string;
  scoreBonus: number;
  options: ScoreOption[];
};

export type ScoreResult = {
  score: number;
  qualified: boolean;
  breakdown: Array<{ key: string; points: number; reason: string }>;
};

export function computeLeadScore(
  answers: Record<string, string>,
  questions: ScoreQuestion[],
  qualificationThreshold: number,
): ScoreResult {
  let score = 0;
  const breakdown: ScoreResult["breakdown"] = [];

  for (const question of questions) {
    const raw = answers[question.key];
    if (raw == null || String(raw).trim() === "") continue;

    if (question.type === "choice") {
      const option = question.options.find((o) => o.label === raw || o.id === raw);
      if (option) {
        score += option.scorePoints;
        breakdown.push({
          key: question.key,
          points: option.scorePoints,
          reason: option.label,
        });
      }
    } else if (question.scoreBonus > 0) {
      score += question.scoreBonus;
      breakdown.push({
        key: question.key,
        points: question.scoreBonus,
        reason: `Bônus ${question.key}`,
      });
    }
  }

  return {
    score,
    qualified: score >= qualificationThreshold,
    breakdown,
  };
}
