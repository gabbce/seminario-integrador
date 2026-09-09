import { type Booking, type Room } from "./domain";
import type { CalendarConfig } from "./calendar";

export const metricSlots = Array.from({ length: 32 }, (_, i) => {
  const label = (n: number) =>
    `${Math.floor(n / 60)
      .toString()
      .padStart(2, "0")}:${(n % 60).toString().padStart(2, "0")}`;
  return { start: label(420 + i * 30), end: label(450 + i * 30) };
});
export type MetricFilter = { room?: string; type?: string };
function normalizedHistory(room: Room) {
  return [
    ...new Map((room.history ?? []).map((event) => [event.at, event])).values(),
  ].sort((a, b) => a.at.localeCompare(b.at));
}
export function dayMetrics(
  date: string,
  bookings: Booking[],
  rooms: Room[],
  calendars: CalendarConfig[],
  filter: MetricFilter = {},
) {
  const calendar = calendars.find((c) => c.year === Number(date.slice(0, 4)));
  const eligible =
    ![0, 6].includes(new Date(`${date}T12:00:00Z`).getUTCDay()) &&
    !!calendar &&
    !calendar.holidays.includes(date);
  const selectedRooms = rooms
    .filter((r) => !filter.room || r.id === filter.room)
    .map((room) => ({ ...room, history: normalizedHistory(room) }));
  let availableHours = 0;
  let unknownCoverage = !calendar;
  const demand = new Map<string, { hours: number; classes: Set<string> }>();
  const classes = new Set<string>();
  const slots = metricSlots.map((slot) => {
    let students = 0,
      count = 0;
    for (const room of selectedRooms) {
      const from = `${date}T${slot.start}`,
        to = `${date}T${slot.end}`;
      const history = room.history.filter((event) => event.at <= from).at(-1);
      const type = history?.type;
      if (eligible && !history) unknownCoverage = true;
      const matches = !filter.type || filter.type === type;
      const uninterrupted = !(room.history ?? []).some(
        (e) => e.at > from && e.at < to && e.state !== "Habilitada",
      );
      if (
        eligible &&
        matches &&
        history?.state === "Habilitada" &&
        uninterrupted
      )
        availableHours += 0.5;
      if (!matches) continue;
      for (const booking of bookings) {
        booking.occurrences.forEach((o, index) => {
          if (
            o.cancelled ||
            o.date !== date ||
            o.room !== room.id ||
            o.start > slot.start ||
            o.end <= slot.start
          )
            return;
          const key = `${booking.id}:${index}`;
          students += booking.students;
          count++;
          classes.add(key);
          const group = type ?? "Tipo histórico desconocido";
          const row = demand.get(group) ?? {
            hours: 0,
            classes: new Set<string>(),
          };
          row.hours += 0.5;
          row.classes.add(key);
          demand.set(group, row);
        });
      }
    }
    return { ...slot, students, classes: count };
  });
  const hours = slots.reduce((sum, s) => sum + s.classes * 0.5, 0);
  const studentHours = slots.reduce((sum, s) => sum + s.students * 0.5, 0);
  return {
    date,
    eligible,
    unknownCoverage,
    slots,
    hours,
    studentHours,
    classes: classes.size,
    availableHours,
    occupancy:
      unknownCoverage || !availableHours
        ? null
        : (100 * hours) / availableHours,
    peakStudents: Math.max(...slots.map((s) => s.students)),
    peakClasses: Math.max(...slots.map((s) => s.classes)),
    demand: [...demand].map(([type, row]) => ({
      type,
      hours: row.hours,
      classes: row.classes.size,
    })),
  };
}
