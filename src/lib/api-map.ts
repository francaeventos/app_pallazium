export function toDateString(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

export function toTimeString(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString().slice(11, 19);
}

export function toIsoString(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString();
}
