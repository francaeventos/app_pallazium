import type { Prisma } from "@/generated/prisma/client";

export function toIso(d: Date) {
  return d.toISOString();
}

export function toDateString(d: Date | null | undefined): string | null {
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

export function toTimeString(d: Date | null | undefined): string | null {
  if (!d) return null;
  const h = String(d.getUTCHours()).padStart(2, "0");
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  const s = String(d.getUTCSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export function parseDateInput(value: string | null | undefined): Date | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return new Date(`${trimmed}T00:00:00.000Z`);
}

export function parseTimeInput(value: string | null | undefined): Date | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(":");
  const h = Number(parts[0] ?? 0);
  const m = Number(parts[1] ?? 0);
  const s = Number(parts[2] ?? 0);
  return new Date(Date.UTC(1970, 0, 1, h, m, s));
}

export function decimalToNumber(value: Prisma.Decimal | null | undefined): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function mapClientRow(c: {
  id: string;
  userId: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  document: string | null;
  notes: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: c.id,
    user_id: c.userId,
    full_name: c.fullName,
    email: c.email,
    phone: c.phone,
    whatsapp: c.whatsapp,
    document: c.document,
    notes: c.notes,
    status: c.status,
    created_at: toIso(c.createdAt),
    updated_at: toIso(c.updatedAt),
  };
}

export function mapClientBrief(c: { id: string; fullName: string }) {
  return { id: c.id, full_name: c.fullName };
}

export function mapClientNested(c: {
  fullName: string;
  email: string;
  whatsapp?: string | null;
}) {
  return {
    full_name: c.fullName,
    email: c.email,
    ...(c.whatsapp !== undefined ? { whatsapp: c.whatsapp } : {}),
  };
}

export function mapEventRow(
  e: {
    id: string;
    clientId: string;
    eventType: string;
    eventDate: Date | null;
    startTime: Date | null;
    endTime: Date | null;
    location: string | null;
    estimatedGuests: number | null;
    contractedValue: Prisma.Decimal | null;
    financialStatus: string | null;
    status: string;
    internalNotes: string | null;
    clientNotes: string | null;
    createdAt: Date;
    updatedAt: Date;
  },
  client?: { fullName: string; email: string; whatsapp?: string | null } | null,
) {
  return {
    id: e.id,
    client_id: e.clientId,
    event_type: e.eventType,
    event_date: toDateString(e.eventDate),
    start_time: toTimeString(e.startTime),
    end_time: toTimeString(e.endTime),
    location: e.location,
    estimated_guests: e.estimatedGuests,
    contracted_value: decimalToNumber(e.contractedValue),
    financial_status: e.financialStatus,
    status: e.status,
    internal_notes: e.internalNotes,
    client_notes: e.clientNotes,
    created_at: toIso(e.createdAt),
    updated_at: toIso(e.updatedAt),
    clients: client ? mapClientNested(client) : null,
  };
}

export function mapChecklistItemRow(item: {
  id: string;
  eventId: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: Date | null;
  clientNotes: string | null;
  internalNotes: string | null;
  attachmentUrl: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: item.id,
    event_id: item.eventId,
    title: item.title,
    description: item.description,
    status: item.status,
    priority: item.priority,
    due_date: toDateString(item.dueDate),
    client_notes: item.clientNotes,
    internal_notes: item.internalNotes,
    attachment_url: item.attachmentUrl,
    sort_order: item.sortOrder,
    created_at: toIso(item.createdAt),
    updated_at: toIso(item.updatedAt),
  };
}

export function mapFinancialStatusOption(o: {
  id: string;
  label: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: o.id,
    label: o.label,
    sort_order: o.sortOrder,
    created_at: toIso(o.createdAt),
    updated_at: toIso(o.updatedAt),
  };
}

export function mapProfileRow(p: {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  document: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: p.id,
    full_name: p.fullName,
    email: p.email,
    phone: p.phone,
    whatsapp: p.whatsapp,
    document: p.document,
    created_at: toIso(p.createdAt),
    updated_at: toIso(p.updatedAt),
  };
}

export function mapUserRoleRow(r: {
  id: string;
  userId: string;
  role: string;
  createdAt: Date;
}) {
  return {
    id: r.id,
    user_id: r.userId,
    role: r.role,
    created_at: toIso(r.createdAt),
  };
}
