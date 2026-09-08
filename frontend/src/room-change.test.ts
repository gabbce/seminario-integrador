import { expect, it } from "vitest";
import { changeRoom } from "./room-change";
import { expand, type Booking } from "./domain";
const patterns = [
  { day: 1, start: "14:00", end: "16:00", room: "203" },
  { day: 3, start: "14:00", end: "16:00", room: "105" },
];
const b: Booking = {
  id: "test",
  subject: "Matemática",
  course: "001-A-2026",
  teacher: "Laura",
  students: 30,
  type: "Multimedios",
  patterns,
  occurrences: expand(patterns),
};
it("cambia patrón y sus futuras; preserva iniciadas, canceladas y otro día", () => {
  const current = {
    ...b,
    occurrences: b.occurrences.map((o, i) =>
      i === 2 ? { ...o, cancelled: true } : o,
    ),
  };
  const result = changeRoom(
    current,
    { version: 0, group: 1, room: "301" },
    [current],
    "Bedel",
    "2026-09-14T14:00",
  );
  if (!result.booking) throw Error(result.error);
  expect(result.booking.patterns?.[0].room).toBe("301");
  expect(result.booking.occurrences[0].room).toBe("203");
  expect(result.booking.occurrences[2].room).toBe("203");
  expect(
    result.booking.occurrences.filter((o) => o.room === "301"),
  ).toHaveLength(10);
  expect(
    result.booking.occurrences.filter((o) => o.room === "105"),
  ).toHaveLength(14);
});
it("un conflicto rechaza todas las fechas, incluso con otra clase de la misma reserva", () => {
  const conflicting = {
    ...b,
    id: "other",
    occurrences: [
      { date: "2026-09-28", start: "15:00", end: "17:00", room: "301" },
    ],
  };
  expect(
    changeRoom(
      b,
      { version: 0, group: 1, room: "301" },
      [b, conflicting],
      "Bedel",
    ).error,
  ).toBeTruthy();
  expect(b.patterns?.[0].room).toBe("203");
});
it("valida versión, rol y requisitos originales", () => {
  expect(
    changeRoom(b, { version: 1, group: 1, room: "301" }, [b], "Bedel").error,
  ).toBeTruthy();
  expect(
    changeRoom(b, { version: 0, group: 1, room: "301" }, [b], "Docente").error,
  ).toBeTruthy();
  expect(
    changeRoom(
      { ...b, resources: ["projector"] },
      { version: 0, group: 1, room: "204" },
      [b],
      "Bedel",
    ).error,
  ).toBeTruthy();
});
it("rechaza todo el cambio si una clase inició desde la revisión", () => {
  const indices = b.occurrences.flatMap((o, i) =>
    new Date(`${o.date}T12:00:00Z`).getUTCDay() === 1 ? [i] : [],
  );
  expect(
    changeRoom(
      b,
      { version: 0, group: 1, room: "301", indices },
      [b],
      "Bedel",
      "2026-09-14T14:00",
    ).error,
  ).toContain("alcance");
});
