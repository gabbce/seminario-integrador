import { expect, it } from "vitest";
import { createCourse, initialCourses } from "./catalog";
it("reutiliza materia normalizada y distingue comisión/año", () => {
  expect(
    createCourse(initialCourses, "  matemática   i  ", " b ", 2026),
  ).toMatchObject({ id: "001-B-2026", subject: "Matemática I" });
  expect(createCourse(initialCourses, "Matemática I", "a", 2026)).toBe(
    initialCourses[0],
  );
  expect(createCourse(initialCourses, "Matemática I", "A", 2027).id).toBe(
    "001-A-2027",
  );
});
it("genera código nuevo y permite superar tres dígitos", () => {
  expect(createCourse(initialCourses, "Química", "A", 2026).id).toBe(
    "007-A-2026",
  );
  expect(
    createCourse([{ ...initialCourses[0], code: 999 }], "Química", "A", 2026)
      .id,
  ).toBe("1000-A-2026");
  expect(() => createCourse(initialCourses, " ", "A", 2026)).toThrow();
});
import { compatible } from "./equipment";
it("exige personas, tipo, pizarrón y todos los recursos pedidos", () => {
  const room = {
    type: "Multimedios",
    capacity: 32,
    resources: ["projector" as const],
    board: "Fibrón",
  };
  expect(
    compatible(room, {
      type: "Multimedios",
      students: 30,
      resources: ["projector"],
    }),
  ).toBe(true);
  expect(compatible(room, { type: "Multimedios", students: 33 })).toBe(false);
  expect(
    compatible(room, {
      type: "Multimedios",
      students: 30,
      resources: ["computer"],
    }),
  ).toBe(false);
  expect(
    compatible(room, { type: "Multimedios", students: 30, board: "Tiza" }),
  ).toBe(false);
});
