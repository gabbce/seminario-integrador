import { expect, it } from "vitest";
import { headerHistoryLabel, roomGroupLabel } from "./reservation-display";

it("shows only changed header values and translates PostgreSQL/Java resources", () => {
  const raw =
    "Datos compartidos: curso 001-A-2027 → 001-A-2027; docente Ana Ruiz → Laura Gómez; alumnos 20 → 24; tipo General → General; pizarrón Tiza → Tiza; recursos {fans} → [air, fans]";
  expect(headerHistoryLabel(raw)).toBe(
    "Datos compartidos: docente Ana Ruiz → Laura Gómez; alumnos 20 → 24; recursos Ventiladores → Aire acondicionado, Ventiladores",
  );
  expect(raw).toContain("tipo General → General");
});
it("treats empty resources and ordering as equivalent without dropping an event", () => {
  expect(
    headerHistoryLabel(
      "Datos compartidos: tipo General → General; recursos {} → []",
    ),
  ).toBe("Datos compartidos: sin cambios en los valores registrados.");
  expect(
    headerHistoryLabel("Datos compartidos: recursos {fans,air} → [air, fans]."),
  ).toBe("Datos compartidos: sin cambios en los valores registrados.");
});
it("preserves unrecognized fields, resources and other audit descriptions", () => {
  expect(
    headerHistoryLabel(
      "Datos compartidos: recursos {} → [future-resource]; observación conservada",
    ),
  ).toBe(
    "Datos compartidos: recursos Sin requisitos → future-resource; observación conservada",
  );
  const other = "Restablecimiento demo: se restauró el escenario registrado.";
  expect(headerHistoryLabel(other)).toBe(other);
  expect(
    headerHistoryLabel("Datos compartidos: recursos {} → [constructor]"),
  ).toBe("Datos compartidos: recursos Sin requisitos → constructor");
});
it("uses human dates and minute precision for room group labels", () => {
  expect(roomGroupLabel("Viernes 21:00:00 · patrón completo")).toBe(
    "Viernes 21:00 · patrón completo",
  );
  expect(roomGroupLabel("2027-03-15 14:00:00.000")).toBe(
    "15 de marzo de 2027 14:00",
  );
  expect(roomGroupLabel("Lunes 14:00–16:00")).toBe("Lunes 14:00–16:00");
  expect(roomGroupLabel("2027-02-30 14:00")).toBe("2027-02-30 14:00");
});
