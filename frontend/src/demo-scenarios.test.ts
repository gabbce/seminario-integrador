import { it, expect } from "vitest";
import { createScenario } from "./demo-scenarios";
import { dayMetrics, rangeMetrics } from "./metrics";
import { headerEditable } from "./booking-header";
import { isFuture } from "./cancellation";
it("escenarios diario y semanal usan exactamente los datos aprobados", () => {
  const d = createScenario("daily");
  const dm = dayMetrics("2026-09-14", d.bookings, d.inventory, [d.calendar]);
  expect([dm.hours, dm.classes, dm.studentHours, dm.availableHours]).toEqual([
    8.5, 5, 312, 64,
  ]);
  const w = createScenario("weekly");
  const wm = rangeMetrics("2026-09-14", "2026-12-18", w.bookings, w.inventory, [
    w.calendar,
  ])!;
  expect([wm.hours, wm.classes, wm.availableHours]).toEqual([108, 54, 4352]);
});
it("escenarios son independientes y el histórico protege iniciadas sin afectar futuras", () => {
  const s = createScenario("started"),
    series = s.bookings.find((b) => b.id === "R-MAT")!;
  expect(series.occurrences).toHaveLength(26);
  expect(headerEditable(series, s.now)).toBe(false);
  expect(isFuture(series.occurrences[0], s.now)).toBe(false);
  expect(isFuture(series.occurrences[1], s.now)).toBe(true);
  s.bookings[0].students = 999;
  s.inventory[0].history = [];
  expect(createScenario("started").bookings[0].students).toBe(60);
  expect(createScenario("base").inventory[0].history).not.toEqual([]);
});
