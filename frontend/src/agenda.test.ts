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

it("uses known history and complete modules rather than current room state", async () => {
  const { roomModuleState } = await import("./agenda");
  const room = {
    id: "1",
    capacity: 30,
    type: "General",
    state: "Baja" as const,
    history: [
      { at: "2027-03-01T10:10:00", state: "Habilitada", type: "General" },
      { at: "2027-03-01T11:10:00", state: "Inhabilitada", type: "General" },
    ],
  };
  expect(roomModuleState(room, "2027-03-01", "10:00", "10:30")).toBe(
    "Sin historia conocida",
  );
  expect(roomModuleState(room, "2027-03-01", "10:30", "11:00")).toBe(
    "Habilitada",
  );
  expect(roomModuleState(room, "2027-03-01", "11:00", "11:30")).toBe(
    "No habilitada durante toda la franja",
  );
});
