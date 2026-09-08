import { expect, it } from "vitest";
import { weekDates, closedDay } from "./agenda";
it("obtiene lunes a viernes desde cualquier día de la semana", () => {
  expect(weekDates("2026-09-20")).toEqual([
    "2026-09-14",
    "2026-09-15",
    "2026-09-16",
    "2026-09-17",
    "2026-09-18",
  ]);
  expect(weekDates("2026-01-01")[0]).toBe("2025-12-29");
});
it("distingue feriado y días fuera de apertura de una fecha sin ocupación", () => {
  expect(closedDay("2026-10-12")).toBe("Fecha no lectiva");
  expect(closedDay("2026-09-12")).toContain("apertura");
  expect(closedDay("2027-01-04")).toContain("Año");
  expect(closedDay("2026-09-14")).toBeNull();
});
