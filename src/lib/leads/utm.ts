/** Parâmetros de campanha capturados do formulário de leads (Google Ads + Meta). */
export const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
] as const;

export type UtmKey = (typeof UTM_KEYS)[number];
export type UtmParams = Partial<Record<UtmKey, string>>;

const STORAGE_PREFIX = "pallazium_lead_utm:";

function storageKey(slug: string) {
  return `${STORAGE_PREFIX}${slug || "leads"}`;
}

function cleanValue(value: string | null | undefined) {
  if (value == null) return "";
  const trimmed = String(value).trim();
  if (!trimmed) return "";
  // Placeholders literais do Google Ads que às vezes vazam sem substituição
  if (/^\{[a-z0-9_]+\}$/i.test(trimmed)) return "";
  return trimmed.slice(0, 500);
}

export function readUtmFromSearch(search: string): UtmParams {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  const out: UtmParams = {};
  for (const key of UTM_KEYS) {
    const value = cleanValue(params.get(key));
    if (value) out[key] = value;
  }
  return out;
}

export function readUtmFromLocation(): UtmParams {
  if (typeof window === "undefined") return {};
  const fromQuery = readUtmFromSearch(window.location.search);
  // Alguns redirecionamentos colocam params no hash
  const hash = window.location.hash.replace(/^#/, "");
  const fromHash =
    hash.includes("=") ? readUtmFromSearch(hash.includes("?") ? hash.split("?")[1] : hash) : {};
  return { ...fromHash, ...fromQuery };
}

export function loadStoredUtm(slug: string): UtmParams {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(storageKey(slug));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as UtmParams;
    if (!parsed || typeof parsed !== "object") return {};
    const out: UtmParams = {};
    for (const key of UTM_KEYS) {
      const value = cleanValue(parsed[key]);
      if (value) out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
}

export function saveStoredUtm(slug: string, utm: UtmParams) {
  if (typeof window === "undefined") return;
  if (!Object.keys(utm).length) return;
  try {
    localStorage.setItem(storageKey(slug), JSON.stringify(utm));
  } catch {
    // ignore
  }
}

/**
 * First-touch: valores já salvos não são sobrescritos por novos.
 * Novos campos vazios na URL não apagam o que já existia.
 */
export function mergeUtmFirstTouch(existing: UtmParams, incoming: UtmParams): UtmParams {
  const out: UtmParams = { ...existing };
  for (const key of UTM_KEYS) {
    const next = cleanValue(incoming[key]);
    if (!next) continue;
    if (!out[key]) out[key] = next;
  }
  return out;
}

/** Captura da URL + first-touch no localStorage (por formulário). */
export function captureLeadUtm(slug: string): UtmParams {
  const fromUrl = readUtmFromLocation();
  const stored = loadStoredUtm(slug);
  const merged = mergeUtmFirstTouch(stored, fromUrl);
  if (Object.keys(merged).length) saveStoredUtm(slug, merged);
  return merged;
}

export function utmHasValues(utm: UtmParams | Record<string, unknown> | null | undefined) {
  if (!utm) return false;
  return UTM_KEYS.some((key) => Boolean(cleanValue(String(utm[key] ?? ""))));
}

export const UTM_LABELS: Record<UtmKey, string> = {
  utm_source: "Source",
  utm_medium: "Medium",
  utm_campaign: "Campaign",
  utm_term: "Term / Keyword",
  utm_content: "Content / Creative",
  gclid: "Google Click ID",
  fbclid: "Meta Click ID",
};
