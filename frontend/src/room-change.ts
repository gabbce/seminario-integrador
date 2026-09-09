import { type Booking, type Role, type Room, overlaps, rooms } from "./domain";
import { compatible } from "./equipment";
import { isFuture } from "./cancellation";
import { demoNow } from "./calendar";
export type RoomChange = {
  version: number;
  group: number;
  room: string;
  indices?: number[];
};
export function groupIndices(b: Booking, group: number, now = demoNow) {
  return b.occurrences.flatMap((o, i) =>
    !o.cancelled &&
    isFuture(o, now) &&
    (b.patterns
      ? new Date(`${o.originalDate ?? o.date}T12:00:00Z`).getUTCDay() === group
      : i === group)
      ? [i]
      : [],
  );
}
export function roomChangeError(
  b: Booking,
  request: RoomChange,
  bookings: Booking[],
  now = demoNow,
  inventory: Room[] = rooms,
): string | undefined {
  const indices = groupIndices(b, request.group, now);
  if (!indices.length)
    return "No quedan clases futuras vigentes en este grupo.";
  const room = inventory.find((r) => r.id === request.room);
  const originalType =
    b.type ??
    inventory.find((r) => r.id === b.occurrences[indices[0]].room)?.type;
  if (!room || !originalType || !compatible(room, { ...b, type: originalType }))
    return "El aula no cumple la capacidad, el tipo o el equipamiento solicitado.";
  const proposed = indices.map((i) => ({
    ...b.occurrences[i],
    room: request.room,
  }));
  const occupied = bookings.flatMap((other) =>
    other.occurrences.filter(
      (o, i) => !o.cancelled && (other.id !== b.id || !indices.includes(i)),
    ),
  );
  if (proposed.some((o) => occupied.some((other) => overlaps(o, other))))
    return "El aula está ocupada en alguna de las fechas. No se guardó ningún cambio.";
}
export function changeRoom(
  b: Booking,
  request: RoomChange,
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
  if (
    request.indices &&
    JSON.stringify(request.indices) !==
      JSON.stringify(groupIndices(b, request.group, now))
  )
    return {
      error:
        "Cambió el conjunto de clases futuras. Volvé al detalle y revisá el alcance.",
    };
  const error = roomChangeError(b, request, bookings, now, inventory);
  if (error) return { error };
  const indices = groupIndices(b, request.group, now);
  return {
    booking: {
      ...b,
      version: (b.version ?? 0) + 1,
      changes: [
        ...(b.changes ?? []),
        {
          at: now,
          actor: role,
          description: `Cambio a aula ${request.room}: ${indices.map((i) => b.occurrences[i].date).join(", ")}`,
        },
      ],
      occurrences: b.occurrences.map((o, i) =>
        indices.includes(i) ? { ...o, room: request.room } : o,
      ),
      patterns: b.patterns?.map((p) =>
        p.day === request.group ? { ...p, room: request.room } : p,
      ),
    },
  };
}
