import { expect, it } from "vitest";
import { validateDates } from "./booking-dates";
const date = { date: "2026-09-14", start: "14:00", end: "16:00", room: "203" };
it("rechaza fecha repetida, no lectiva, fin de semana y pasado", () => {
  expect(validateDates([date, date])).toContain("una sola vez");
  expect(validateDates([{ ...date, date: "2026-10-12" }])).toContain(
    "no lectiva",
  );
  expect(validateDates([{ ...date, date: "2026-09-12" }])).toContain(
    "lunes a viernes",
  );
  expect(
    validateDates([{ ...date, date: "2026-09-08", start: "10:00" }]),
  ).toContain("posterior");
});
it("exige fecha real y horario de apertura, permite fechas fuera de cuatrimestres", () => {
  expect(validateDates([{ ...date, date: "2026-02-30" }])).toContain("válidas");
  expect(validateDates([{ ...date, end: "24:00" }])).toContain("23:00");
  expect(validateDates([{ ...date, date: "2026-12-21" }])).toBeNull();
});
