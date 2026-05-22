import type { Database } from "@/integrations/supabase/types";

export type InvitationStatus = Database["public"]["Enums"]["invitation_status"];
export type RsvpStatus = Database["public"]["Enums"]["rsvp_status"];

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

export function rsvpBadgeVariant(status: RsvpStatus) {
  return status === "confirmado" ? "default" : "outline";
}
