import { rooms, type Booking, type Room } from "./domain";
export type ListFilters = {
  mode: "day" | "course";
  date: string;
  course: string;
  room: string;
  type: string;
  status: "active" | "cancelled" | "all";
};
export function listingRows(
  bookings: Booking[],
  filters: ListFilters,
  inventory: Room[] = rooms,
) {
  return bookings
    .flatMap((booking) =>
      booking.occurrences.map((occurrence) => ({
        booking,
        occurrence,
        type:
          booking.type ??
          inventory.find((r) => r.id === occurrence.room)?.type ??
          "Sin tipo",
      })),
    )
    .filter(
      ({ booking, occurrence, type }) =>
        (filters.mode === "day"
          ? occurrence.date === filters.date
          : booking.course === filters.course) &&
        (!filters.room || occurrence.room === filters.room) &&
        (!filters.type || type === filters.type) &&
        (filters.status === "all" ||
          Boolean(occurrence.cancelled) === (filters.status === "cancelled")),
    )
    .sort(
      (a, b) =>
        (filters.mode === "day"
          ? a.type.localeCompare(b.type)
          : a.occurrence.date.localeCompare(b.occurrence.date)) ||
        a.occurrence.start.localeCompare(b.occurrence.start) ||
        a.occurrence.room.localeCompare(b.occurrence.room, "es", {
          numeric: true,
        }) ||
        a.booking.id.localeCompare(b.booking.id),
    );
}
