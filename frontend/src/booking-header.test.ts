import { expect, it } from "vitest";
import {
  changeHeader,
  headerEditable,
  type HeaderChange,
} from "./booking-header";
import { initialBookings } from "./domain";
import { initialCourses } from "./catalog";
const b = initialBookings[1];
const request: HeaderChange = {
  version: 0,
  course: "001-A-2026",
  teacher: "Laura Gómez",
  students: 30,
  type: "Multimedios",
  resources: ["projector"],
  board: "Fibrón",
};
it("actualiza datos y contacto sin modificar clases", () => {
  const r = changeHeader(b, request, initialCourses, "Bedel");
  if (!r.booking) throw Error(r.error);
  expect(r.booking.subject).toBe("Matemática I");
  expect(r.booking.teacherEmail).toContain("@");
  expect(r.booking.occurrences).toEqual(b.occurrences);
  expect(r.booking.changes).toHaveLength(1);
});
it("protege inicio exacto incluso de clase cancelada y rechaza versión o rol", () => {
  expect(headerEditable(b, "2026-09-14T14:00")).toBe(false);
  const mixed = {
    ...b,
    occurrences: [
      { ...b.occurrences[0], date: "2026-09-07", cancelled: true },
      ...b.occurrences,
    ],
  };
  expect(
    changeHeader(mixed, request, initialCourses, "Bedel").error,
  ).toBeTruthy();
  expect(
    changeHeader(b, { ...request, version: 1 }, initialCourses, "Bedel").error,
  ).toBeTruthy();
  expect(
    changeHeader(b, request, initialCourses, "Docente").error,
  ).toBeTruthy();
});
it("revalida capacidad y recursos en todas las aulas", () => {
  expect(
    changeHeader(b, { ...request, students: 41 }, initialCourses, "Bedel")
      .error,
  ).toContain("Aula 105");
  const other = {
    ...b,
    occurrences: [
      ...b.occurrences,
      { date: "2026-09-21", start: "14:00", end: "16:00", room: "204" },
    ],
  };
  expect(changeHeader(other, request, initialCourses, "Bedel").error).toContain(
    "Aula 204",
  );
  expect(b.students).toBe(36);
});
