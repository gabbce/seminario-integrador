import { describe, it, expect } from "vitest";
import { dayMetrics } from "./metrics";
import { rooms, initialBookings, type Booking } from "./domain";
import { initialCalendar } from "./calendar";
const date = "2026-09-14";
const math: Booking = {
  id: "math",
  subject: "Matemática I",
  course: "001-A-2026",
  teacher: "Docente",
  students: 30,
  occurrences: [{ date, start: "14:00", end: "16:00", room: "203" }],
};
const daily = [...initialBookings, math];
describe("indicadores diarios", () => {
  it("reproduce el ejemplo aprobado sin contar capacidad ni personas únicas", () => {
    const m = dayMetrics(date, daily, rooms.slice(0, 4), [initialCalendar]);
    expect(m.slots).toHaveLength(32);
    expect(m.hours).toBe(8.5);
    expect(m.classes).toBe(5);
    expect(m.availableHours).toBe(64);
    expect(m.occupancy).toBeCloseTo(13.28125);
    expect(m.studentHours).toBe(312);
    expect(m.peakStudents).toBe(126);
    expect(m.peakClasses).toBe(3);
    expect(m.slots.filter((s) => s.classes === 3).map((s) => s.start)).toEqual([
      "14:00",
      "15:00",
    ]);
    expect(m.slots.find((s) => s.start === "16:00")?.students).toBe(64);
  });
  it("cancelaciones y filtros afectan numerador y denominador juntos", () => {
    const m = dayMetrics(
      date,
      [
        {
          ...math,
          occurrences: math.occurrences.map((o) => ({ ...o, cancelled: true })),
        },
      ],
      rooms,
      [initialCalendar],
      { room: "203" },
    );
    expect(m.hours).toBe(0);
    expect(m.occupancy).toBe(0);
    expect(m.availableHours).toBe(16);
    const lab = dayMetrics(date, daily, rooms, [initialCalendar], {
      type: "Laboratorio",
    });
    expect(lab.hours).toBe(2);
    expect(lab.availableHours).toBe(16);
  });
  it("conserva histórico aunque aula y año estén cerrados hoy", () => {
    const room = {
      ...rooms[0],
      state: "Baja" as const,
      history: [
        ...rooms[0].history!,
        { at: "2026-09-15T10:10", state: "Baja", type: "Multimedios" },
      ],
    };
    expect(
      dayMetrics(date, [], [room], [{ ...initialCalendar, state: "Cerrado" }])
        .availableHours,
    ).toBe(16);
    expect(
      dayMetrics("2026-09-15", [], [room], [initialCalendar]).availableHours,
    ).toBe(3);
  });
  it("cuenta módulos completos y atribuye tipo al inicio sin interrumpir disponibilidad", () => {
    const room = {
      ...rooms[0],
      history: [
        { at: date + "T10:10", state: "Habilitada", type: "General" },
        { at: date + "T11:10", state: "Habilitada", type: "Multimedios" },
      ],
    };
    const general = dayMetrics(date, [], [room], [initialCalendar], {
      type: "General",
    });
    const media = dayMetrics(date, [], [room], [initialCalendar], {
      type: "Multimedios",
    });
    expect(general.availableHours).toBe(1);
    expect(media.availableHours).toBe(11.5);
    expect(general.unknownCoverage).toBe(true);
    expect(general.occupancy).toBeNull();
  });
  it("distingue cero, fechas no aplicables y cobertura desconocida; receso permite esporádicas", () => {
    expect(dayMetrics(date, [], rooms, [initialCalendar]).occupancy).toBe(0);
    const closed = dayMetrics("2026-10-12", [], rooms, [initialCalendar]);
    expect(closed.eligible).toBe(false);
    expect(closed.occupancy).toBeNull();
    expect(
      dayMetrics(date, [], [{ ...rooms[0], history: [] }], [initialCalendar])
        .unknownCoverage,
    ).toBe(true);
    expect(
      dayMetrics("2026-07-20", [], rooms, [initialCalendar]).availableHours,
    ).toBe(96);
  });
});
it("el último cambio del mismo instante prevalece sin interrupciones de duración cero", () => {
  const room = {
    ...rooms[0],
    history: [
      ...rooms[0].history!,
      { at: date + "T10:10", state: "Inhabilitada", type: "General" },
      { at: date + "T10:10", state: "Habilitada", type: "Multimedios" },
    ],
  };
  expect(dayMetrics(date, [], [room], [initialCalendar]).availableHours).toBe(
    16,
  );
  const disabled = {
    ...room,
    history: [
      ...room.history,
      { at: date + "T10:10", state: "Inhabilitada", type: "Multimedios" },
    ],
  };
  expect(
    dayMetrics(date, [], [disabled], [initialCalendar]).availableHours,
  ).toBe(3);
});
