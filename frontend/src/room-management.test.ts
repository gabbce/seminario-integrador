import { expect, it } from "vitest";
import { rooms, initialBookings } from "./domain";
import { saveRoom } from "./room-management";
it("protege futuras/en curso al reducir capacidad o cambiar estado", () => {
  const room = rooms[0];
  expect(
    saveRoom(
      rooms,
      { ...room, capacity: 30 },
      room.id,
      initialBookings,
      "Bedel",
    ).error,
  ).toContain("R-002");
  expect(
    saveRoom(
      rooms,
      { ...room, state: "Mantenimiento" },
      room.id,
      initialBookings,
      "Bedel",
      "2026-09-14T14:30",
    ).error,
  ).toContain("R-002");
});
it("baja preserva identidad e historia y prohíbe reutilización", () => {
  const room = rooms[1];
  const result = saveRoom(
    rooms,
    { ...room, state: "Baja" },
    room.id,
    initialBookings,
    "Bedel",
  );
  if (!result.rooms) throw Error(result.error);
  expect(result.rooms[1].history).toHaveLength(2);
  expect(
    saveRoom(result.rooms, { ...room }, undefined, [], "Bedel").error,
  ).toBeTruthy();
  expect(
    saveRoom(
      result.rooms,
      { ...result.rooms[1], state: "Habilitada" },
      room.id,
      [],
      "Bedel",
    ).error,
  ).toContain("restaurar");
});
it("permite alta, conserva piso negativo y registra comienzo de cobertura", () => {
  const result = saveRoom(
    rooms,
    { ...rooms[1], id: "S01", floor: -1, history: [] },
    undefined,
    [],
    "Administrador",
  );
  if (!result.rooms) throw Error(result.error);
  expect(result.rooms.at(-1)?.history).toHaveLength(1);
  expect(result.rooms.at(-1)?.floor).toBe(-1);
  expect(
    saveRoom(rooms, { ...rooms[1], id: "S01" }, undefined, [], "Docente").error,
  ).toBeTruthy();
});
