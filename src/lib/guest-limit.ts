export const GUEST_LIMIT_ERROR_MESSAGE =
  "Atenção! Limite excedido\n\nSua lista ultrapassou em mais de 10% o número de convidados contratados. Entre em contato com nossa equipe para regularizar os convidados adicionais.";

/** Convidados contratados podem ter até 10% de excedente antes de bloquear novas confirmações. */
export function assertGuestLimitNotExceeded(
  estimatedGuests: number | null | undefined,
  confirmedPeopleTotal: number,
) {
  if (estimatedGuests == null) return;
  if (confirmedPeopleTotal > estimatedGuests * 1.1) {
    throw new Error(GUEST_LIMIT_ERROR_MESSAGE);
  }
}
