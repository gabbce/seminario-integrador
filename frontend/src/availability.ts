import {
  minutes,
  overlaps,
  type Booking,
  type Occurrence,
  type Room,
} from "./domain";
export type Conflict = {
  booking: Booking;
  occurrence: Occurrence;
  from: number;
  to: number;
};
export type Alternative = {
  room: Room;
  conflicts: Conflict[];
  sporadicDates: number;
  sporadicMinutes: number;
  periodicMinutes: number;
};
function unionMinutes(intervals: { from: number; to: number }[]) {
  const sorted = [...intervals].sort((a, b) => a.from - b.from);
  let total = 0,
    end = -Infinity;
  for (const i of sorted) {
    total += Math.max(0, i.to - Math.max(end, i.from));
    end = Math.max(end, i.to);
  }
  return total;
}
export function roomOptions(
  request: Occurrence[],
  candidates: Room[],
  bookings: Booking[],
  mode: "periodic" | "sporadic" = "periodic",
): Alternative[] {
  return candidates
    .map((room) => {
      const conflicts = request.flatMap((o) =>
        bookings.flatMap((booking) =>
          booking.occurrences
            .filter(
              (other) =>
                !other.cancelled && overlaps({ ...o, room: room.id }, other),
            )
            .map((occurrence) => ({
              booking,
              occurrence,
              from: Math.max(minutes(o.start), minutes(occurrence.start)),
              to: Math.min(minutes(o.end), minutes(occurrence.end)),
            })),
        ),
      );
      function total(periodic: boolean) {
        const relevant = conflicts.filter(
          (c) => Boolean(c.booking.patterns) === periodic,
        );
        return [...new Set(relevant.map((c) => c.occurrence.date))].reduce(
          (sum, date) =>
            sum +
            unionMinutes(relevant.filter((c) => c.occurrence.date === date)),
          0,
        );
      }
      return {
        room,
        conflicts,
        sporadicDates: new Set(
          conflicts
            .filter((c) => !c.booking.patterns)
            .map((c) => c.occurrence.date),
        ).size,
        sporadicMinutes: total(false),
        periodicMinutes: total(true),
      };
    })
    .sort((a, b) => {
      const free =
        Number(Boolean(a.conflicts.length)) -
        Number(Boolean(b.conflicts.length));
      if (free) return free;
      if (mode === "periodic") {
        const group =
          Number(a.periodicMinutes > 0) - Number(b.periodicMinutes > 0);
        if (group) return group;
        const metric =
          a.periodicMinutes > 0
            ? a.periodicMinutes - b.periodicMinutes ||
              a.sporadicDates - b.sporadicDates
            : a.sporadicDates - b.sporadicDates ||
              a.sporadicMinutes - b.sporadicMinutes;
        if (metric) return metric;
      } else {
        const metric =
          a.periodicMinutes +
          a.sporadicMinutes -
          b.periodicMinutes -
          b.sporadicMinutes;
        if (metric) return metric;
      }
      return (
        a.room.capacity - b.room.capacity ||
        a.room.id.localeCompare(b.room.id, "es", { numeric: true })
      );
    });
}
