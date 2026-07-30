import { db } from "@/lib/db";

/** Padrinhos confirmados também ocupam vaga no limite de convidados contratados. */
export function getConfirmedPartyCount(eventId: string) {
  return db.eventPartyMember.count({ where: { eventId, rsvpStatus: "confirmado" } });
}
