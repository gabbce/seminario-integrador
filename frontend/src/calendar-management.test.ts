import { expect, it } from "vitest";
import { initialCalendar } from "./calendar";
import { changeCalendar } from "./calendar-management";
import { expand, rooms, type Booking } from "./domain";
const patterns = [{ day: 1, start: "14:00", end: "16:00", room: "203" }];
const b: Booking = {
  id: "test",
  subject: "Matemática",
  course: "001-A-2026",
  teacher: "Laura",
  students: 30,
  type: "Multimedios",
  patterns,
  schedule: { period: "second", excluded: [] },
  occurrences: expand(patterns),
};
it("ampliar agrega futuras y quitar feriado genera clase con aula del patrón", () => {
  const proposal = {
    ...initialCalendar,
    terms: {
      ...initialCalendar.terms,
      second: ["2026-09-14", "2026-12-23"] as const,
    },
    holidays: ["2026-11-23"],
  };
  const result = changeCalendar(
    initialCalendar,
    proposal,
    [b],
    rooms,
    "Administrador",
  );
  if (!result.impact) throw Error(result.error);
  expect(result.impact.added.map((o) => o.date)).toEqual([
    "2026-10-12",
    "2026-12-21",
  ]);
  expect(result.impact.added.every((o) => o.room === "203")).toBe(true);
  expect(b.occurrences).toHaveLength(12);
});
it("preserva exclusiones, canceladas, excepciones y cese de continuidad", () => {
  const proposal = { ...initialCalendar, holidays: [] };
  const excluded = {
    ...b,
    schedule: { period: "second" as const, excluded: ["2026-10-12"] },
    occurrences: [
      ...b.occurrences,
      {
        date: "2026-11-24",
        originalDate: "2026-11-23",
        start: "14:00",
        end: "16:00",
        room: "203",
      },
    ],
  };
  const result = changeCalendar(
    initialCalendar,
    proposal,
    [excluded],
    rooms,
    "Administrador",
  );
  expect(result.impact?.added).toHaveLength(0);
  expect(
    changeCalendar(
      initialCalendar,
      proposal,
      [{ ...b, continuityCancelledAt: "2026-09-08T10:00" }],
      rooms,
      "Administrador",
    ).impact?.added,
  ).toHaveLength(0);
  const cancelled = {
    ...b,
    occurrences: [
      ...b.occurrences,
      {
        date: "2026-10-12",
        start: "14:00",
        end: "16:00",
        room: "203",
        cancelled: true,
      },
    ],
  };
  expect(
    changeCalendar(
      initialCalendar,
      proposal,
      [cancelled],
      rooms,
      "Administrador",
    ).impact?.added.map((o) => o.date),
  ).toEqual(["2026-11-23"]);
});
it("conflicto en nuevas clases rechaza calendario completo", () => {
  const other = {
    ...b,
    id: "other",
    patterns: undefined,
    schedule: undefined,
    occurrences: [
      { date: "2026-10-12", start: "15:00", end: "17:00", room: "203" },
    ],
  };
  const result = changeCalendar(
    initialCalendar,
    { ...initialCalendar, holidays: [] },
    [b, other],
    rooms,
    "Administrador",
  );
  expect(result.error).toContain("Conflicto");
  expect(initialCalendar.holidays).toHaveLength(2);
});
it("bloquea feriado con reserva, pasado, recorte y rol", () => {
  expect(
    changeCalendar(
      initialCalendar,
      {
        ...initialCalendar,
        holidays: [...initialCalendar.holidays, "2026-09-14"],
        descriptions: {
          ...initialCalendar.descriptions,
          "2026-09-14": "Cierre",
        },
      },
      [b],
      rooms,
      "Administrador",
    ).error,
  ).toContain("test");
  expect(
    changeCalendar(
      initialCalendar,
      {
        ...initialCalendar,
        holidays: ["2026-01-01"],
        descriptions: { "2026-01-01": "Pasado" },
      },
      [],
      rooms,
      "Administrador",
    ).error,
  ).toContain("pasadas");
  expect(
    changeCalendar(
      initialCalendar,
      {
        ...initialCalendar,
        terms: {
          ...initialCalendar.terms,
          second: ["2026-09-21", "2026-12-18"],
        },
      },
      [b],
      rooms,
      "Administrador",
    ).error,
  ).toContain("recorte");
  expect(
    changeCalendar(initialCalendar, initialCalendar, [], rooms, "Bedel").error,
  ).toBeTruthy();
});
