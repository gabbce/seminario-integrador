import type { Booking, Occurrence, Role } from "./domain";
import { demoNow } from "./calendar";
export const isFuture = (o: Occurrence, now = demoNow) =>
  `${o.date}T${o.start}` > now;
export const bookingState = (b: Booking) =>
  b.occurrences.every((o) => o.cancelled) ? "CANCELADA" : "CONFIRMADA";
export type Cancellation = {
  indices: number[];
  reason: string;
  version: number;
};
export function cancelClasses(
  b: Booking,
  request: Cancellation,
  role: Role,
  now = demoNow,
): { booking: Booking; error?: never } | { error: string; booking?: never } {
  if (role === "Docente")
    return { error: "Tu cuenta solo permite consultar reservas." };
  if (request.version !== (b.version ?? 0))
    return {
      error: "La reserva cambió. Volvé al detalle y revisá la versión actual.",
    };
  if (!request.reason.trim())
    return { error: "Indicá el motivo de cancelación." };
  const selected = new Set(request.indices);
  if (!selected.size) return { error: "Seleccioná al menos una clase futura." };
  if (
    [...selected].some(
      (i) =>
        !Number.isInteger(i) ||
        !b.occurrences[i] ||
        b.occurrences[i].cancelled ||
        !isFuture(b.occurrences[i], now),
    )
  )
    return {
      error:
        "Una clase seleccionada ya comenzó o fue cancelada. No se guardó ningún cambio.",
    };
  const occurrences = b.occurrences.map((o, i) =>
    selected.has(i)
      ? {
          ...o,
          cancelled: true,
          cancellation: {
            reason: request.reason.trim(),
            actor:
              role === "Administrador"
                ? "Administrador · admin@demo.local"
                : "Bedel · bedel@demo.local",
            at: now,
          },
        }
      : o,
  );
  return {
    booking: {
      ...b,
      occurrences,
      version: (b.version ?? 0) + 1,
      continuityCancelledAt:
        b.patterns && !occurrences.some((o) => !o.cancelled && isFuture(o, now))
          ? now
          : b.continuityCancelledAt,
    },
  };
}
