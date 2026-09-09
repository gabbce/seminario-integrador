import { type Booking, type Role, type Room, overlaps, rooms } from "./domain";
import { demoNow, terms } from "./calendar";
import { isFuture } from "./cancellation";
import { validateDates } from "./booking-dates";
import { compatible } from "./equipment";
export type Reschedule = {
  version: number;
  dates: { index: number; date: string; start: string; end: string }[];
};
export function reschedule(
  b: Booking,
  request: Reschedule,
  bookings: Booking[],
  role: Role,
  now = demoNow,
  inventory: Room[] = rooms,
): { booking: Booking; error?: never } | { error: string; booking?: never } {
  if (role === "Docente")
    return { error: "Tu cuenta solo permite consultar reservas." };
  if ((b.version ?? 0) !== request.version)
    return {
      error: "La reserva cambió. Volvé al detalle y revisá la versión actual.",
    };
  const selected = new Set(request.dates.map((d) => d.index));
  if (!selected.size || selected.size !== request.dates.length)
    return { error: "Seleccioná clases distintas para reprogramar." };
  if (
    request.dates.some(
      (d) =>
        !Number.isInteger(d.index) ||
        !b.occurrences[d.index] ||
        b.occurrences[d.index].cancelled ||
        !isFuture(b.occurrences[d.index], now),
    )
  )
    return {
      error:
        "Una clase seleccionada ya comenzó o fue cancelada. No se guardó ningún cambio.",
    };
  const proposed = request.dates.map((d) => ({
    ...b.occurrences[d.index],
    date: d.date,
    start: d.start,
    end: d.end,
    originalDate: b.patterns
      ? (b.occurrences[d.index].originalDate ?? b.occurrences[d.index].date)
      : undefined,
  }));
  const invalid = validateDates(proposed, now);
  if (invalid) return { error: invalid };
  if (b.patterns) {
    if (!b.schedule)
      return { error: "La reserva no tiene períodos asignados." };
    const ranges =
      b.schedule.period === "annual"
        ? [terms.first, terms.second]
        : [terms[b.schedule.period]];
    if (
      proposed.some(
        (o) => !ranges.some(([from, to]) => o.date >= from && o.date <= to),
      )
    )
      return {
        error:
          "La fecha debe pertenecer a los períodos de la reserva. Para recuperar fuera, cancelá la original y registrá una esporádica.",
      };
  }
  const unchanged = b.occurrences.filter((_, i) => !selected.has(i));
  if (
    proposed.some((o) =>
      unchanged.some((other) => !other.cancelled && other.date === o.date),
    )
  )
    return {
      error: "Ya hay otra clase vigente de esta reserva en la fecha elegida.",
    };
  const occupied = bookings.flatMap((other) =>
    other.occurrences.filter(
      (o, i) => !o.cancelled && (other.id !== b.id || !selected.has(i)),
    ),
  );
  if (proposed.some((o) => occupied.some((other) => overlaps(o, other))))
    return {
      error:
        "El aula está ocupada en el nuevo horario. No se guardó ningún cambio.",
    };
  if (
    proposed.some((o) => {
      const room = inventory.find((r) => r.id === o.room);
      return !room || !compatible(room, { ...b, type: b.type ?? room.type });
    })
  )
    return { error: "El aula ya no cumple los requisitos de la reserva." };
  return {
    booking: {
      ...b,
      version: (b.version ?? 0) + 1,
      occurrences: b.occurrences.map((o, i) => {
        const position = request.dates.findIndex((d) => d.index === i);
        return position < 0 ? o : proposed[position];
      }),
      changes: [
        ...(b.changes ?? []),
        {
          at: now,
          actor: role,
          description: `Reprogramación: ${request.dates.map((d) => `${b.occurrences[d.index].date} ${b.occurrences[d.index].start}–${b.occurrences[d.index].end} → ${d.date} ${d.start}–${d.end}`).join("; ")}`,
        },
      ],
    },
  };
}
