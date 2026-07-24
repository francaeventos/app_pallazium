export type LeadTemperature = "frio" | "morno" | "quente" | "muito_quente";
export type ConversionMinTemperature = "any" | "morno" | "quente" | "muito_quente";

export type ScoreBands = {
  coldMax: number;
  warmMax: number;
  hotMax: number;
};

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
  temperature: LeadTemperature;
  qualified: boolean;
  breakdown: Array<{ key: string; points: number; reason: string }>;
};

const TEMP_RANK: Record<LeadTemperature, number> = {
  frio: 0,
  morno: 1,
  quente: 2,
  muito_quente: 3,
};

const CONV_RANK: Record<ConversionMinTemperature, number> = {
  any: 0,
  morno: 1,
  quente: 2,
  muito_quente: 3,
};

export function temperatureFromScore(score: number, bands: ScoreBands): LeadTemperature {
  if (score <= bands.coldMax) return "frio";
  if (score <= bands.warmMax) return "morno";
  if (score <= bands.hotMax) return "quente";
  return "muito_quente";
}

/** Qualificado = quente ou muito quente (score > warmMax). */
export function isQualifiedTemperature(temperature: LeadTemperature) {
  return temperature === "quente" || temperature === "muito_quente";
}

export function meetsConversionTemperature(
  temperature: LeadTemperature,
  min: ConversionMinTemperature,
) {
  if (min === "any") return true;
  return TEMP_RANK[temperature] >= CONV_RANK[min];
}

export function qualificationThresholdFromBands(bands: ScoreBands) {
  return bands.warmMax + 1;
}

export function bandsFromForm(form: {
  scoreColdMax?: number;
  scoreWarmMax?: number;
  scoreHotMax?: number;
  qualificationThreshold?: number;
}): ScoreBands {
  const coldMax = form.scoreColdMax ?? 24;
  const warmMax = form.scoreWarmMax ?? Math.max(coldMax + 1, (form.qualificationThreshold ?? 50) - 1);
  const hotMax = form.scoreHotMax ?? Math.max(warmMax + 1, 74);
  return { coldMax, warmMax, hotMax };
}

export function temperatureLabel(temperature: LeadTemperature) {
  switch (temperature) {
    case "frio":
      return "Frio";
    case "morno":
      return "Morno";
    case "quente":
      return "Quente";
    case "muito_quente":
      return "Muito quente";
  }
}

export function computeLeadScore(
  answers: Record<string, string>,
  questions: ScoreQuestion[],
  bandsOrThreshold: ScoreBands | number,
): ScoreResult {
  let score = 0;
  const breakdown: ScoreResult["breakdown"] = [];

  for (const question of questions) {
    const raw = answers[question.key];
    if (raw == null || String(raw).trim() === "") continue;

    if (question.type === "choice" || question.type === "buttons" || question.type === "scale" || question.type === "rating") {
      const option = question.options.find((o) => o.label === raw || o.id === raw);
      if (option) {
        score += option.scorePoints;
        breakdown.push({
          key: question.key,
          points: option.scorePoints,
          reason: option.label,
        });
      }
    } else if (question.type === "multi") {
      const selected = String(raw)
        .split(/\s*\|\s*/)
        .map((s) => s.trim())
        .filter(Boolean);
      let points = 0;
      for (const label of selected) {
        const option = question.options.find((o) => o.label === label || o.id === label);
        if (option) points += option.scorePoints;
      }
      if (points > 0) {
        score += points;
        breakdown.push({
          key: question.key,
          points,
          reason: selected.join(", "),
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

  const bands: ScoreBands =
    typeof bandsOrThreshold === "number"
      ? {
          coldMax: Math.max(0, Math.floor(bandsOrThreshold * 0.4) - 1),
          warmMax: Math.max(0, bandsOrThreshold - 1),
          hotMax: Math.max(bandsOrThreshold, 74),
        }
      : bandsOrThreshold;

  const temperature = temperatureFromScore(score, bands);
  return {
    score,
    temperature,
    qualified: isQualifiedTemperature(temperature),
    breakdown,
  };
}
