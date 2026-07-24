/** Máscara visual dd/mm/aaaa para digitação no quiz. */
export function formatDateMaskBr(value: string) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** Exibe sempre dd/mm/aaaa (aceita ISO ou BR). */
export function formatLeadDateBr(value: string) {
  const parsed = parseLeadDate(value);
  if (!parsed) return String(value || "").trim();
  const [y, m, d] = parsed.iso.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * Aceita dd/mm/aaaa ou yyyy-mm-dd e devolve ISO yyyy-mm-dd + Date local.
 * Retorna null se incompleto/inválido.
 */
export function parseLeadDate(value: string): { iso: string; date: Date } | null {
  const raw = String(value || "").trim();
  if (!raw) return null;

  let day: number;
  let month: number;
  let year: number;

  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (br) {
    day = Number(br[1]);
    month = Number(br[2]);
    year = Number(br[3]);
  } else if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  } else {
    return null;
  }

  if (year < 1900 || year > 2100) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;

  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return { iso: `${year}-${mm}-${dd}`, date };
}

export function validateLeadDate(value: string, opts?: { futureOnly?: boolean }): string | null {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "Escolhe uma data pra continuar.";
  if (trimmed.replace(/\D/g, "").length < 8) return "Digite a data completa (dd/mm/aaaa).";

  const parsed = parseLeadDate(trimmed);
  if (!parsed) return "Data inválida. Use dd/mm/aaaa.";

  if (opts?.futureOnly !== false) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (parsed.date < today) return "Essa data já passou. Escolhe uma data futura.";
  }
  return null;
}
