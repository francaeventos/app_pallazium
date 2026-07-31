import type { RsvpStatus } from "@/generated/prisma/client";

export type { RsvpStatus };
export type InvitationStatus = "rascunho" | "publicado" | "pausado";

export const invitationStatusLabels: Record<InvitationStatus, string> = {
  rascunho: "Rascunho",
  publicado: "Publicado",
  pausado: "Pausado",
};

export const rsvpStatusLabels: Record<RsvpStatus, string> = {
  pendente: "Pendente",
  confirmado: "Confirmado",
  recusado: "Recusado",
};

export function publicInvitationUrl(token?: string | null) {
  if (!token || typeof window === "undefined") return "";
  return `${window.location.origin}/convite/${token}`;
}

export function publicPartyMemberInvitationUrl(token?: string | null) {
  if (!token || typeof window === "undefined") return "";
  return `${window.location.origin}/convite/padrinho/${token}`;
}

export function rsvpBadgeVariant(status: RsvpStatus) {
  return status === "confirmado" ? "default" : "outline";
}
