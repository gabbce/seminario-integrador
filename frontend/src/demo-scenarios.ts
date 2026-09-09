import { initialBookings, rooms, type Booking } from "./domain";
import { initialCalendar, candidateDates } from "./calendar";
import { teachers } from "./teachers";
export const scenarioOptions = [
  [
    "base",
    "Reserva nueva",
    "Cuatro clases iniciales, seis aulas. Matemática todavía no está registrada.",
  ],
  [
    "daily",
    "Operación diaria",
    "Cinco clases y cuatro aulas: 8,5 horas, 13,3 % y 312 alumnos-hora.",
  ],
  [
    "weekly",
    "Semana típica",
    "Dos series, cuatro aulas: 54 clases, 108 horas y 2,5 % de ocupación.",
  ],
  [
    "series",
    "Serie registrada",
    "Matemática: 26 clases, lunes en 203 y miércoles en 105.",
  ],
  [
    "calendar",
    "Impacto de calendario",
    "Serie registrada y una esporádica que bloquea el 23/12 en 105.",
  ],
  [
    "started",
    "Protección temporal",
    "Reloj 14/09 a las 14:30: clases iniciadas y futuras en la misma serie.",
  ],
  [
    "empty",
    "Sin clases",
    "Aulas habilitadas sin reservas. Cero actividad, con horas disponibles.",
  ],
  [
    "closed",
    "Sin horas habilitadas",
    "Aulas inhabilitadas sin reservas. No se calcula porcentaje de ocupación.",
  ],
  [
    "unknown",
    "Cobertura desconocida",
    "Sin historial de aulas: no se infiere disponibilidad histórica.",
  ],
  [
    "many",
    "Muchas aulas y listado extenso",
    "Treinta aulas y treinta clases el 14/09, para desplazamiento e impresión.",
  ],
] as const;
export type ScenarioId = (typeof scenarioOptions)[number][0];
function math(): Booking {
  return {
    id: "R-MAT",
    subject: "Matemática I",
    course: "001-A-2026",
    teacher: "Laura Gómez",
    teacherEmail: teachers.find((t) => t.name === "Laura Gómez")?.email,
    students: 30,
    type: "Multimedios",
    resources: ["projector"],
    registrant: initialBookings[0].registrant,
    occurrences: [],
    schedule: { year: 2026, period: "second", excluded: [] },
    patterns: [
      { day: 1, start: "14:00", end: "16:00", room: "203" },
      { day: 3, start: "14:00", end: "16:00", room: "105" },
    ],
  };
}
function fillSeries(booking: Booking) {
  return {
    ...booking,
    occurrences: booking
      .patterns!.flatMap((p) =>
        candidateDates(p.day, "second")
          .filter((date) => !initialCalendar.holidays.includes(date))
          .map((date) => ({ date, start: p.start, end: p.end, room: p.room })),
      )
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}
export function createScenario(id: ScenarioId) {
  let inventory = structuredClone(rooms),
    bookings = structuredClone(initialBookings);
  const series = fillSeries(math());
  if (id === "daily") {
    inventory = inventory.slice(0, 4);
    bookings.push({
      ...math(),
      schedule: undefined,
      patterns: undefined,
      occurrences: [
        { date: "2026-09-14", start: "14:00", end: "16:00", room: "203" },
      ],
    });
  }
  if (id === "weekly") {
    inventory = inventory.slice(0, 4);
    bookings = [
      series,
      fillSeries({
        ...initialBookings[1],
        id: "R-FIS",
        schedule: series.schedule,
        patterns: [
          { day: 2, start: "15:00", end: "17:00", room: "105" },
          { day: 4, start: "15:00", end: "17:00", room: "105" },
        ],
      }),
    ];
  }
  if (["series", "calendar", "started"].includes(id)) bookings.push(series);
  if (id === "calendar")
    bookings.push({
      ...initialBookings[1],
      id: "R-BLOCK",
      occurrences: [
        { date: "2026-12-23", start: "14:00", end: "16:00", room: "105" },
      ],
    });
  if (["empty", "closed", "unknown"].includes(id)) bookings = [];
  if (id === "closed")
    inventory = inventory.map((r) => ({
      ...r,
      state: "Inhabilitada",
      history: r.history!.map((h) => ({ ...h, state: "Inhabilitada" })),
    }));
  if (id === "unknown")
    inventory = inventory.map((r) => ({ ...r, history: [] }));
  if (id === "many") {
    inventory = Array.from({ length: 30 }, (_, i) => ({
      ...structuredClone(rooms[0]),
      id: `D${String(i + 1).padStart(2, "0")}`,
    }));
    bookings = inventory.map((r, i) => ({
      ...initialBookings[1],
      id: `D-${i + 1}`,
      occurrences: [
        { date: "2026-09-14", start: "14:00", end: "15:00", room: r.id },
      ],
    }));
  }
  return {
    inventory,
    bookings,
    calendar: structuredClone(initialCalendar),
    now: id === "started" ? "2026-09-14T14:30" : "2026-09-08T10:00",
  };
}
