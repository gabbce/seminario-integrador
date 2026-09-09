import { type CalendarConfig, candidateDates, demoNow } from "./calendar";
import { type Booking, type Room, type Role, overlaps } from "./domain";
import { compatible } from "./equipment";
export type CalendarImpact = {
  calendar: CalendarConfig;
  bookings: Booking[];
  added: {
    booking: string;
    date: string;
    start: string;
    end: string;
    room: string;
  }[];
};
export function changeCalendar(
  before: CalendarConfig,
  proposal: CalendarConfig,
  bookings: Booking[],
  rooms: Room[],
  role: Role,
  now = demoNow,
):
  | { impact: CalendarImpact; error?: never }
  | { error: string; impact?: never } {
  if (role !== "Administrador")
    return { error: "Solo Administración puede modificar el calendario." };
  if (before.version !== proposal.version)
    return {
      error:
        "El calendario cambió. Volvé a abrirlo para revisar la versión actual.",
    };
  const valid = (date: string) =>
    /^2026-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(new Date(`${date}T12:00:00Z`).getTime()) &&
    new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date;
  if (
    Object.values(proposal.terms).some(
      ([from, to]) => !valid(from) || !valid(to) || from > to,
    ) ||
    proposal.terms.first[1] >= proposal.terms.second[0]
  )
    return {
      error:
        "Completá ambos cuatrimestres con fechas válidas de 2026, sin superposición.",
    };
  if (
    new Set(proposal.holidays).size !== proposal.holidays.length ||
    proposal.holidays.some(
      (d) => !valid(d) || !proposal.descriptions[d]?.trim(),
    )
  )
    return {
      error:
        "Cada fecha no lectiva debe ser válida, única y tener descripción.",
    };
  const changed = [
    ...before.holidays.filter((d) => !proposal.holidays.includes(d)),
    ...proposal.holidays.filter((d) => !before.holidays.includes(d)),
  ];
  if (changed.some((d) => d < now.slice(0, 10)))
    return {
      error: "No se pueden agregar ni quitar fechas no lectivas pasadas.",
    };
  for (const b of bookings) {
    for (const o of b.occurrences) {
      if (
        !o.cancelled &&
        proposal.holidays.includes(o.date) &&
        !before.holidays.includes(o.date)
      )
        return {
          error: `La fecha no lectiva afecta ${b.id} (${b.subject}), ${o.date}. Reprogramá o cancelá esa clase primero.`,
        };
      if (b.patterns && b.schedule) {
        const ranges =
          b.schedule.period === "annual"
            ? Object.values(proposal.terms)
            : [proposal.terms[b.schedule.period]];
        if (!ranges.some(([from, to]) => o.date >= from && o.date <= to))
          return {
            error: `El recorte deja una clase registrada de ${b.id} fuera de su período (${o.date}).`,
          };
      }
    }
  }
  const added: CalendarImpact["added"] = [];
  const next: Booking[] = bookings.map((b) => {
    if (
      !b.patterns ||
      !b.schedule ||
      b.continuityCancelledAt ||
      b.occurrences.every((o) => o.cancelled)
    )
      return b;
    const schedule = b.schedule;
    const generated = b.patterns.flatMap((p) =>
      candidateDates(p.day, schedule.period, proposal)
        .filter(
          (date) =>
            `${date}T${p.start}` > now &&
            !proposal.holidays.includes(date) &&
            !schedule.excluded.includes(date) &&
            !b.occurrences.some(
              (o) => (o.originalDate ?? o.date) === date || o.date === date,
            ) &&
            (!candidateDates(p.day, schedule.period, before).includes(date) ||
              before.holidays.includes(date)),
        )
        .map((date) => ({ date, start: p.start, end: p.end, room: p.room })),
    );
    generated.forEach((o) => added.push({ booking: b.id, ...o }));
    return generated.length
      ? {
          ...b,
          version: (b.version ?? 0) + 1,
          occurrences: [...b.occurrences, ...generated].sort((a, b) =>
            a.date.localeCompare(b.date),
          ),
        }
      : b;
  });
  for (const entry of added) {
    const room = rooms.find((r) => r.id === entry.room);
    const booking = next.find((b) => b.id === entry.booking)!;
    if (
      !room ||
      !compatible(room, { ...booking, type: booking.type ?? room.type })
    )
      return {
        error: `El aula ${entry.room} no cumple los requisitos para ${entry.booking} (${entry.date}).`,
      };
    const conflict = next.find((b) =>
      b.occurrences.some(
        (o) =>
          !(
            b.id === entry.booking &&
            o.date === entry.date &&
            o.start === entry.start
          ) &&
          !o.cancelled &&
          overlaps(entry, o),
      ),
    );
    if (conflict)
      return {
        error: `Conflicto en Aula ${entry.room}, ${entry.date} ${entry.start}–${entry.end}: la nueva clase de ${entry.booking} se solapa con ${conflict.id} (${conflict.subject}, ${conflict.course}, ${conflict.teacher}). Resolvé las reservas antes de cambiar el calendario.`,
      };
  }
  return {
    impact: {
      calendar: { ...proposal, version: before.version + 1 },
      bookings: next,
      added,
    },
  };
}
