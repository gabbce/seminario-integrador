import { rooms, type Booking } from "./domain";
export type ListFilters = {
  mode: "day" | "course";
  date: string;
  course: string;
  room: string;
  type: string;
  status: "active" | "cancelled" | "all";
};
export function listingRows(bookings: Booking[], filters: ListFilters) {
  return bookings
    .flatMap((booking) =>
      booking.occurrences.map((occurrence) => ({
        booking,
        occurrence,
        type:
          rooms.find((r) => r.id === occurrence.room)?.type ??
          booking.type ??
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
