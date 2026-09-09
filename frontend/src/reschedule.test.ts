import { expect, it } from "vitest";
import { reschedule } from "./reschedule";
import { expand, type Booking } from "./domain";
import { groupIndices } from "./room-change";
const patterns = [{ day: 1, start: "14:00", end: "16:00", room: "203" }];
const b: Booking = {
  id: "test",
  subject: "Matemática",
  teacher: "Laura",
  course: "001-A-2026",
  students: 30,
  patterns,
  schedule: { period: "second", excluded: [] },
  occurrences: expand(patterns),
};
const request = {
  version: 0,
  dates: [{ index: 0, date: "2026-09-15", start: "14:00", end: "16:00" }],
};
it("preserva aula, patrón y fecha original incluso al reprogramar dos veces", () => {
  const first = reschedule(b, request, [b], "Bedel");
  if (!first.booking) throw Error(first.error);
  const second = reschedule(
    first.booking,
    { version: 1, dates: [{ ...request.dates[0], date: "2026-09-16" }] },
    [first.booking],
    "Bedel",
  );
  if (!second.booking) throw Error(second.error);
  expect(second.booking.occurrences[0]).toMatchObject({
    originalDate: "2026-09-14",
    date: "2026-09-16",
    room: "203",
  });
  expect(second.booking.patterns).toEqual(patterns);
  expect(groupIndices(second.booking, 1)).toContain(0);
  expect(groupIndices(second.booking, 3)).not.toContain(0);
});
it("rechaza fuera de período, feriado, versión vieja y clase iniciada", () => {
  for (const date of ["2026-12-21", "2026-10-12", "2026-09-19"])
    expect(
      reschedule(
        b,
        { ...request, dates: [{ ...request.dates[0], date }] },
        [b],
        "Bedel",
      ).error,
    ).toBeTruthy();
  expect(
    reschedule(b, { ...request, version: 1 }, [b], "Bedel").error,
  ).toBeTruthy();
  expect(
    reschedule(b, request, [b], "Bedel", "2026-09-14T14:00").error,
  ).toBeTruthy();
  expect(reschedule(b, request, [b], "Docente").error).toBeTruthy();
});
it("rechaza todo un conjunto cuando una fecha tiene conflicto", () => {
  const other = {
    ...b,
    id: "other",
    occurrences: [
      { date: "2026-09-22", start: "15:00", end: "16:00", room: "203" },
    ],
  };
  expect(
    reschedule(
      b,
      {
        ...request,
        dates: [
          ...request.dates,
          { index: 1, date: "2026-09-22", start: "14:00", end: "16:00" },
        ],
      },
      [b, other],
      "Bedel",
    ).error,
  ).toContain("ocupada");
  expect(b.occurrences[0].date).toBe("2026-09-14");
});
