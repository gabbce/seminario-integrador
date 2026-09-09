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

export function validMetricDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number(value.slice(0, 4)) >= 1 &&
    Number.isFinite(new Date(`${value}T12:00:00Z`).getTime()) &&
    new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value
  );
}
export function rangeMetrics(
  from: string,
  to: string,
  bookings: Booking[],
  rooms: Room[],
  calendars: CalendarConfig[],
  filter: MetricFilter = {},
) {
  if (!validMetricDate(from) || !validMetricDate(to) || from > to) return null;
  const days: ReturnType<typeof dayMetrics>[] = [];
  // Only registered calendars can supply eligible dates. Missing years remain unknown.
  for (const calendar of calendars) {
    const year = String(calendar.year).padStart(4, "0");
    const start = from > `${year}-01-01` ? from : `${year}-01-01`;
    const end = to < `${year}-12-31` ? to : `${year}-12-31`;
    for (let date = start; date <= end;) {
      days.push(dayMetrics(date, bookings, rooms, calendars, filter));
      if (date === end) break;
      const next = new Date(`${date}T12:00:00Z`);
      next.setUTCDate(next.getUTCDate() + 1);
      date = next.toISOString().slice(0, 10);
    }
  }
  const expectedDays =
    (new Date(`${to}T12:00:00Z`).getTime() -
      new Date(`${from}T12:00:00Z`).getTime()) /
      86400000 +
    1;
  const sum = (
    items: typeof days,
    key: "hours" | "availableHours" | "classes" | "studentHours",
  ) => items.reduce((total, d) => total + d[key], 0);
  const week = [1, 2, 3, 4, 5].map((day) => {
    const eligible = days.filter(
      (d) => d.eligible && new Date(`${d.date}T12:00:00Z`).getUTCDay() === day,
    );
    const slots = metricSlots.map((slot, index) => ({
      ...slot,
      students: eligible.length
        ? eligible.reduce((total, d) => total + d.slots[index].students, 0) /
          eligible.length
        : null,
      classes: eligible.length
        ? eligible.reduce((total, d) => total + d.slots[index].classes, 0) /
          eligible.length
        : null,
    }));
    return {
      day,
      dates: eligible.map((d) => d.date),
      slots,
      studentHours: eligible.length
        ? sum(eligible, "studentHours") / eligible.length
        : null,
      classes: eligible.length
        ? sum(eligible, "classes") / eligible.length
        : null,
      peakStudents: eligible.length
        ? Math.max(...slots.map((s) => s.students!))
        : null,
      peakClasses: eligible.length
        ? Math.max(...slots.map((s) => s.classes!))
        : null,
      peakDateStudents: eligible.length
        ? Math.max(...eligible.map((d) => d.peakStudents))
        : null,
    };
  });
  const hours = sum(days, "hours"),
    availableHours = sum(days, "availableHours"),
    unknownCoverage =
      days.length !== expectedDays || days.some((d) => d.unknownCoverage);
  const demand = new Map<
    string,
    { type: string; hours: number; classes: number }
  >();
  for (const day of days)
    for (const row of day.demand) {
      const previous = demand.get(row.type) ?? {
        type: row.type,
        hours: 0,
        classes: 0,
      };
      demand.set(row.type, {
        type: row.type,
        hours: previous.hours + row.hours,
        classes: previous.classes + row.classes,
      });
    }
  return {
    from,
    to,
    week,
    eligible: days.some((d) => d.eligible),
    unknownCoverage,
    hours,
    availableHours,
    classes: sum(days, "classes"),
    studentHours: sum(days, "studentHours"),
    occupancy:
      unknownCoverage || !availableHours
        ? null
        : (100 * hours) / availableHours,
    demand: [...demand.values()],
  };
}
