export function maskPhone(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) {
    return d
      .replace(/^(\d{0,2})(\d{0,4})(\d{0,4}).*/, (_, a, b, c) =>
        [a && `(${a}`, a && a.length === 2 ? ") " : "", b, c && `-${c}`].filter(Boolean).join(""),
      )
      .trim();
  }
  return d.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, (_, a, b, c) =>
    c ? `(${a}) ${b}-${c}` : `(${a}) ${b}`,
  );
}

export function maskDocument(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/^(\d{0,3})(\d{0,3})(\d{0,3})(\d{0,2}).*/, (_, a, b, c, e) =>
        [a, b && `.${b}`, c && `.${c}`, e && `-${e}`].filter(Boolean).join(""),
      )
      .trim();
  }
  return d
    .replace(/^(\d{0,2})(\d{0,3})(\d{0,3})(\d{0,4})(\d{0,2}).*/, (_, a, b, c, e, f) =>
      [a, b && `.${b}`, c && `.${c}`, e && `/${e}`, f && `-${f}`].filter(Boolean).join(""),
    )
    .trim();
}

export const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
