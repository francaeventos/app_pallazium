const DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38, 41, 42, 43,
  44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74, 75, 77,
  79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

export function normalizePhone(value: string): string {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("0055")) digits = digits.slice(2);
  if (!digits.startsWith("55") && (digits.length === 10 || digits.length === 11)) {
    digits = `55${digits}`;
  }
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    const ddd = digits.slice(2, 4);
    let sub = digits.slice(4);
    if (sub.length === 8 && /^[6-9]/.test(sub)) sub = `9${sub}`;
    digits = `55${ddd}${sub}`;
  }
  return digits;
}

export function validateWhatsApp(value: string): string | null {
  const digits = normalizePhone(value);
  if (!/^55\d{11}$/.test(digits)) {
    return "Coloca um celular válido com DDD. Ex.: (11) 99999-9999";
  }
  if (!DDDS.has(Number(digits.slice(2, 4)))) {
    return "DDD inválido. Confere o DDD do seu celular.";
  }
  const sub = digits.slice(4);
  if (sub[0] !== "9") return "Precisa ser um celular (com o 9 depois do DDD).";
  const rest = sub.slice(1);
  if (/^(\d)\1{7}$/.test(rest)) {
    return "Esse número não parece real. Digita seu WhatsApp de verdade.";
  }
  let asc = true;
  let desc = true;
  for (let i = 1; i < rest.length; i++) {
    if (Number(rest[i]) !== Number(rest[i - 1]) + 1) asc = false;
    if (Number(rest[i]) !== Number(rest[i - 1]) - 1) desc = false;
  }
  if (asc || desc) {
    return "Esse número não parece real. Digita seu WhatsApp de verdade.";
  }
  return null;
}

export function formatPhoneMask(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}
