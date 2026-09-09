import { it, expect } from "vitest";
import { rangeMetrics } from "./metrics";
import { rooms, type Booking } from "./domain";
import { initialCalendar, candidateDates } from "./calendar";
function series(
  id: string,
  days: number[],
  students: number,
  start: string,
  end: string,
  room: string,
): Booking {
  return {
    id,
    subject: id,
    course: id,
    teacher: "Docente",
    students,
    occurrences: days.flatMap((day) =>
      candidateDates(day, "second")
        .filter((date) => !initialCalendar.holidays.includes(date))
        .map((date) => ({ date, start, end, room })),
    ),
  };
}
const bookings = [
  series("math", [1, 3], 30, "14:00", "16:00", "203"),
  series("physics", [2, 4], 36, "15:00", "17:00", "105"),
];
it("reproduce la semana aprobada con medias por fecha y viernes cero", () => {
  const m = rangeMetrics(
    "2026-09-14",
    "2026-12-18",
    bookings,
    rooms.slice(0, 4),
    [initialCalendar],
  )!;
  expect(m.hours).toBe(108);
  expect(m.availableHours).toBe(4352);
  expect(m.classes).toBe(54);
  expect(m.occupancy).toBeCloseTo(2.4816, 3);
  expect(m.week.map((d) => d.dates.length)).toEqual([12, 14, 14, 14, 14]);
  expect(m.week.map((d) => d.studentHours)).toEqual([60, 72, 60, 72, 0]);
  expect(m.week[0].slots.find((s) => s.start === "14:00")?.students).toBe(30);
  expect(m.week[1].slots.find((s) => s.start === "15:00")?.classes).toBe(1);
  expect(m.week[4].slots.every((s) => s.students === 0)).toBe(true);
});
it("incluye ceros, no elimina días sin aulas y distingue pico promedio y fecha concreta", () => {
  const booking = {
    ...bookings[0],
    occurrences: bookings[0].occurrences.slice(0, 1),
  };
  const m = rangeMetrics(
    "2026-09-14",
    "2026-09-21",
    [booking],
    rooms.map((r) => ({
      ...r,
      history: r.history!.map((h) => ({ ...h, state: "Inhabilitada" })),
    })),
    [{ ...initialCalendar, state: "Cerrado" }],
  )!;
  expect(m.week[0].dates.length).toBe(2);
  expect(m.week[0].peakStudents).toBe(15);
  expect(m.week[0].peakDateStudents).toBe(30);
  expect(m.week[0].studentHours).toBe(30);
  expect(m.availableHours).toBe(0);
  expect(m.occupancy).toBeNull();
});
it("diferencia sin fechas de cero e invalida rangos incorrectos", () => {
  const m = rangeMetrics("2026-10-12", "2026-10-12", [], rooms, [
    initialCalendar,
  ])!;
  expect(m.eligible).toBe(false);
  expect(m.week[0].studentHours).toBeNull();
  expect(
    rangeMetrics("2026-09-15", "2026-09-14", [], rooms, [initialCalendar]),
  ).toBeNull();
  expect(
    rangeMetrics("2026-02-30", "2026-03-03", [], rooms, [initialCalendar]),
  ).toBeNull();
});
it("calcula ocupación total con sumas ponderadas y mantiene filtros", () => {
  const m = rangeMetrics(
    "2026-09-14",
    "2026-09-15",
    bookings,
    [
      {
        ...rooms[0],
        history: [
          { at: "2026-09-15T15:00", state: "Habilitada", type: "Multimedios" },
        ],
      },
      rooms[1],
    ],
    [initialCalendar],
    { room: "203" },
  )!;
  expect(m.hours).toBe(2);
  expect(m.availableHours).toBe(32);
  expect(m.occupancy).toBe(6.25);
  expect(m.unknownCoverage).toBe(false);
});
it("tolera extremos de fecha y señala calendarios desconocidos sin recorrer miles de años", () => {
  const m = rangeMetrics("0001-01-01", "9999-12-31", [], rooms, [
    initialCalendar,
  ])!;
  expect(m.unknownCoverage).toBe(true);
  expect(m.occupancy).toBeNull();
  const last = rangeMetrics("9999-12-31", "9999-12-31", [], rooms, [
    { ...initialCalendar, year: 9999, holidays: [] },
  ])!;
  expect(last.eligible).toBe(true);
  expect(
    rangeMetrics("2026-99-01", "2026-99-02", [], rooms, [initialCalendar]),
  ).toBeNull();
});
