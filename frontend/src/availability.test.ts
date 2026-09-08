import { expect, it } from "vitest";
import { roomOptions } from "./availability";
import { type Booking } from "./domain";
const request = [
  { date: "2026-09-14", start: "14:00", end: "16:00", room: "" },
  { date: "2026-09-21", start: "14:00", end: "16:00", room: "" },
];
const rooms = ["A", "B", "C", "D"].map((id) => ({
  id,
  capacity: 40,
  type: "General",
}));
const blocking = (
  id: string,
  room: string,
  date: string,
  start: string,
  end: string,
  periodic = false,
): Booking => ({
  id,
  subject: "Clase",
  course: "001-A-2026",
  teacher: "Laura Gómez",
  students: 30,
  occurrences: [{ room, date, start, end }],
  ...(periodic ? { patterns: [{ day: 1, start, end, room }] } : {}),
});
it("ordena libres, esporádicas por fechas y periódicas por minutos", () => {
  const options = roomOptions(request, rooms, [
    blocking("1", "A", "2026-09-14", "14:00", "16:00"),
    blocking("2", "B", "2026-09-14", "14:00", "14:30"),
    blocking("3", "B", "2026-09-21", "14:00", "14:30"),
    blocking("4", "C", "2026-09-14", "14:00", "14:30", true),
  ]);
  expect(options.map((o) => o.room.id)).toEqual(["D", "A", "B", "C"]);
});
it("cuenta unión de intervalos por fecha y modalidad sin duplicar", () => {
  const [option] = roomOptions(
    request,
    [rooms[0]],
    [
      blocking("1", "A", "2026-09-14", "14:00", "15:00"),
      blocking("2", "A", "2026-09-14", "14:30", "16:00"),
    ],
  );
  expect(option.sporadicDates).toBe(1);
  expect(option.sporadicMinutes).toBe(120);
});
it("no cuenta canceladas ni intervalos contiguos", () => {
  const cancelled = blocking("1", "A", "2026-09-14", "14:00", "15:00");
  cancelled.occurrences[0].cancelled = true;
  expect(
    roomOptions(
      request,
      [rooms[0]],
      [cancelled, blocking("2", "A", "2026-09-14", "16:00", "17:00")],
    )[0].conflicts,
  ).toHaveLength(0);
});
it("periódicas se ordenan por interferencia acumulada", () => {
  const options = roomOptions(request, rooms.slice(0, 2), [
    blocking("1", "A", "2026-09-14", "14:00", "16:00", true),
    blocking("2", "B", "2026-09-14", "14:00", "14:30", true),
  ]);
  expect(options.map((o) => o.room.id)).toEqual(["B", "A"]);
});
