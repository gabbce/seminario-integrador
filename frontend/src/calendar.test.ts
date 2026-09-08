import { expect, it } from "vitest";
import { expand, datesFor, omittedDates } from "./domain";
const patterns = [{ day: 1, start: "14:00", end: "16:00", room: "203" }];
it("la anual omite pasado y receso, sin perder la segunda mitad", () => {
  expect(expand(patterns, { period: "annual", excluded: [] })).toHaveLength(12);
  expect(
    omittedDates(patterns, { period: "annual", excluded: [] }).some(
      (o) => o.reason === "Ya iniciada",
    ),
  ).toBe(true);
  expect(
    omittedDates(patterns, { period: "annual", excluded: [] }).some(
      (o) => o.date === "2026-08-03",
    ),
  ).toBe(false);
});
it("exclusiones explícitas reducen todo el patrón sin cambiar el aula", () => {
  expect(
    datesFor(1, { period: "second", excluded: ["2026-09-14"] }),
  ).toHaveLength(11);
  const occurrences = expand(patterns, {
    period: "second",
    excluded: ["2026-09-14"],
  });
  expect(occurrences.every((o) => o.room === "203")).toBe(true);
  expect(occurrences.some((o) => o.date === "2026-09-14")).toBe(false);
});
it("el primer cuatrimestre ya terminado no genera clases futuras", () => {
  expect(expand(patterns, { period: "first", excluded: [] })).toEqual([]);
});
