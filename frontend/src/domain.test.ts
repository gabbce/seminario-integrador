import { describe, expect, it } from "vitest";
import {
  available,
  datesFor,
  expand,
  initialBookings,
  overlaps,
  validateBooking,
} from "./domain";
const patterns = [
  { day: 1, start: "14:00", end: "16:00", room: "203" },
  { day: 3, start: "14:00", end: "16:00", room: "105" },
];
const booking = {
  id: "new",
  subject: "Matemática I",
  course: "001-A-2026",
  teacher: "Laura Gómez",
  students: 30,
  occurrences: expand(patterns),
};
describe("recurrencia y disponibilidad", () => {
  it("genera 26 clases, 12 lunes y 14 miércoles sin feriados", () => {
    expect(datesFor(1)).toHaveLength(12);
    expect(datesFor(3)).toHaveLength(14);
    expect(booking.occurrences).toHaveLength(26);
    expect(
      booking.occurrences.some((o) =>
        ["2026-10-12", "2026-11-23"].includes(o.date),
      ),
    ).toBe(false);
    expect(
      booking.occurrences
        .filter((o) => new Date(o.date).getUTCDay() === 1)
        .every((o) => o.room === "203"),
    ).toBe(true);
  });
  it("permite horarios consecutivos pero bloquea solapamientos", () => {
    const a = { date: "2026-09-14", room: "203", start: "14:00", end: "16:00" };
    expect(overlaps(a, { ...a, start: "16:00", end: "17:00" })).toBe(false);
    expect(overlaps(a, { ...a, start: "15:30", end: "17:00" })).toBe(true);
  });
  it("un solo conflicto impide ofrecer el aula para el patrón completo", () => {
    expect(available(patterns[0], "105", initialBookings)).toBe(false);
    expect(available(patterns[0], "203", initialBookings)).toBe(true);
  });
  it("revalida antes del guardado, incluyendo capacidad y horas", () => {
    expect(validateBooking(booking, initialBookings)).toBeNull();
    expect(validateBooking(booking, [...initialBookings, booking])).toContain(
      "no se guardó",
    );
    expect(validateBooking({ ...booking, students: 50 }, [])).toContain(
      "capacidad",
    );
    expect(
      validateBooking(
        {
          ...booking,
          occurrences: [{ ...booking.occurrences[0], start: "14:15" }],
        },
        [],
      ),
    ).toContain("30 minutos");
  });
});
