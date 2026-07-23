export type AgendaConfig = {
  weekdays: number[];
  times: string[];
  daysAhead: number;
  leadHours: number;
  capacityPerSlot: number;
};

export type AgendaSlot = {
  id: string;
  label: string;
  startsAt: string;
  available: boolean;
  remaining: number;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function buildAgendaSlots(
  config: AgendaConfig,
  bookedCounts: Record<string, number>,
  now = new Date(),
): AgendaSlot[] {
  const slots: AgendaSlot[] = [];
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const minTime = new Date(now.getTime() + config.leadHours * 60 * 60 * 1000);

  for (let day = 0; day < config.daysAhead; day++) {
    const date = new Date(start);
    date.setDate(start.getDate() + day);
    const weekday = date.getDay();
    if (!config.weekdays.includes(weekday)) continue;

    for (const time of config.times) {
      const [hh, mm] = time.split(":").map(Number);
      const startsAt = new Date(date);
      startsAt.setHours(hh || 0, mm || 0, 0, 0);
      if (startsAt < minTime) continue;

      const id = `${startsAt.getFullYear()}-${pad(startsAt.getMonth() + 1)}-${pad(startsAt.getDate())} ${pad(hh || 0)}:${pad(mm || 0)}`;
      const booked = bookedCounts[id] ?? 0;
      const remaining = Math.max(0, config.capacityPerSlot - booked);
      const label = startsAt.toLocaleString("pt-BR", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });

      slots.push({
        id,
        label,
        startsAt: startsAt.toISOString(),
        available: remaining > 0,
        remaining,
      });
    }
  }

  return slots;
}
