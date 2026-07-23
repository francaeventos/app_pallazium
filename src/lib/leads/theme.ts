/** Escurece um hex ~28% (header gradient). */
export function darkenHex(hex: string, amount = 0.28): string {
  const raw = hex.replace("#", "").trim();
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return "#0D655B";
  const num = Number.parseInt(full, 16);
  const r = Math.max(0, Math.round(((num >> 16) & 255) * (1 - amount)));
  const g = Math.max(0, Math.round(((num >> 8) & 255) * (1 - amount)));
  const b = Math.max(0, Math.round((num & 255) * (1 - amount)));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export const LEAD_PRIMARY_PRESETS = [
  "#128C7E",
  "#21B8DE",
  "#7563AB",
  "#E85D4C",
  "#1E3A5F",
  "#0F766E",
] as const;
