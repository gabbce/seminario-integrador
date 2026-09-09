import { expect, it } from "vitest";
import { emptyCalendar, initialCalendar } from "./calendar";
import { addYear, deleteYear, yearMutationError } from "./academic-years";
import { changeCalendar } from "./calendar-management";
import { initialBookings, rooms } from "./domain";
const blank = emptyCalendar(2027);
it("requiere dos cuatrimestres válidos para habilitar", () => {
  expect(
    addYear([initialCalendar], 2027, "Administrador").calendars?.[1].state,
  ).toBe("En preparación");
  expect(
    changeCalendar(
      blank,
      {
        ...blank,
        state: "Habilitado",
        terms: { ...blank.terms, first: ["2027-03-08", "2027-07-02"] },
      },
      [],
      rooms,
      "Administrador",
    ).error,
  ).toBeTruthy();
  expect(
    changeCalendar(
      blank,
      {
        ...blank,
        state: "Habilitado",
        terms: {
          first: ["2027-03-08", "2027-07-02"],
          second: ["2027-09-13", "2027-12-17"],
        },
      },
      [],
      rooms,
      "Administrador",
    ).impact?.calendar.state,
  ).toBe("Habilitado");
});
it("cierre protege futuras y año cerrado no admite cambios", () => {
  expect(
    changeCalendar(
      initialCalendar,
      { ...initialCalendar, state: "Cerrado" },
      initialBookings,
      rooms,
      "Administrador",
    ).error,
  ).toContain("futuras");
  const closed = { ...initialCalendar, state: "Cerrado" as const };
  expect(
    changeCalendar(closed, initialCalendar, [], rooms, "Administrador").error,
  ).toContain("consulta");
  expect(yearMutationError(initialBookings[0], [closed])).toBeTruthy();
});
it("eliminación de cuatrimestre conserva dependencias e impide preparación con esporádica futura", () => {
  const proposal = {
    ...initialCalendar,
    state: "En preparación" as const,
    terms: { ...initialCalendar.terms, second: ["", ""] as const },
  };
  expect(
    changeCalendar(
      initialCalendar,
      proposal,
      initialBookings,
      rooms,
      "Administrador",
    ).error,
  ).toContain("futuras");
  const b = {
    ...initialBookings[0],
    patterns: [{ day: 1, start: "13:00", end: "14:30", room: "108" }],
    schedule: { period: "second" as const, excluded: [] },
    occurrences: initialBookings[0].occurrences.map((o) => ({
      ...o,
      cancelled: true,
    })),
  };
  expect(
    changeCalendar(initialCalendar, proposal, [b], rooms, "Administrador")
      .error,
  ).toContain("asociadas");
});
it("elimina solo año vacío en preparación y no modifica reservas de otro año", () => {
  expect(
    deleteYear(
      [initialCalendar, blank],
      2027,
      initialBookings,
      [],
      "Administrador",
    ).calendars,
  ).toEqual([initialCalendar]);
  expect(
    deleteYear([initialCalendar], 2026, [], [], "Administrador").error,
  ).toBeTruthy();
  const result = changeCalendar(
    blank,
    blank,
    initialBookings,
    rooms,
    "Administrador",
  );
  expect(result.impact?.bookings).toEqual(initialBookings);
});
it("cerrar sin clases vigentes conserva histórico y bloquea reapertura", () => {
  const historical = initialBookings.map((b) => ({
    ...b,
    occurrences: b.occurrences.map((o) => ({ ...o, cancelled: true })),
  }));
  const result = changeCalendar(
    initialCalendar,
    { ...initialCalendar, state: "Cerrado" },
    historical,
    rooms,
    "Administrador",
  );
  expect(result.impact?.bookings).toEqual(historical);
  expect(result.impact?.calendar.state).toBe("Cerrado");
});
