import { validateDates } from "./booking-dates";
import { compatible, type Resource } from "./equipment";
import { teachers } from "./teachers";
import {
  initialCalendar,
  type CalendarConfig,
  candidateDates,
  omission,
  defaultSchedule,
  type Schedule,
} from "./calendar";
export { holidays, omittedDates } from "./calendar";
export type Role = "Administrador" | "Bedel" | "Docente";
export type Room = {
  version?: number;
  state?: "Habilitada" | "Inhabilitada" | "Mantenimiento" | "Baja";
  location?: string;
  floor?: number;
  computers?: number;
  history?: { at: string; state: string; type: string }[];
  id: string;
  capacity: number;
  type: string;
  resources?: Resource[];
  board?: string;
};
export type Occurrence = {
  originalDate?: string;
  date: string;
  start: string;
  end: string;
  room: string;
  cancelled?: boolean;
  cancellation?: { reason: string; actor: string; at: string };
};
export type Booking = {
  changes?: { at: string; actor: string; description: string }[];
  version?: number;
  continuityCancelledAt?: string;
  id: string;
  subject: string;
  course: string;
  teacher: string;
  students: number;
  type?: string;
  resources?: Resource[];
  board?: string;
  teacherEmail?: string;
  registrant?: {
    userId?: string;
    name: string;
    email: string;
    inactive?: boolean;
  };
  occurrences: Occurrence[];
  schedule?: Schedule;
  patterns?: Pattern[];
};
export type Pattern = { day: number; start: string; end: string; room: string };
const roomFixtures: Room[] = [
  { id: "105", capacity: 40, type: "Multimedios" },
  { id: "203", capacity: 32, type: "Multimedios" },
  { id: "108", capacity: 60, type: "General" },
  { id: "Lab 2", capacity: 24, type: "Laboratorio" },
  { id: "301", capacity: 48, type: "Multimedios" },
  { id: "204", capacity: 60, type: "Multimedios" },
];
export const rooms: Room[] = roomFixtures.map((r) => ({
  ...r,
  state: "Habilitada",
  location: "Edificio A",
  floor: r.id === "Lab 2" ? 0 : Number(r.id[0]),
  computers: r.type === "Laboratorio" ? 24 : undefined,
  history: [{ at: "2026-01-01T00:00", state: "Habilitada", type: r.type }],
  board: r.id === "108" ? "Tiza" : "Fibrón",
  resources:
    r.type === "Multimedios"
      ? r.id === "204"
        ? ["fans", "television"]
        : ["air", "projector", "computer"]
      : ["fans"],
}));
export const dayNames = [
  "",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
];
export const minutes = (time: string) =>
  Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
export function datesFor(
  day: number,
  schedule: Schedule = defaultSchedule,
  start = "14:00",
  calendar: CalendarConfig = initialCalendar,
): string[] {
  return candidateDates(day, schedule.period, calendar).filter(
    (date) => !omission(date, start, schedule, calendar),
  );
}
export function expand(
  patterns: Pattern[],
  schedule: Schedule = defaultSchedule,
  calendar: CalendarConfig = initialCalendar,
): Occurrence[] {
  return patterns
    .flatMap((p) =>
      datesFor(p.day, schedule, p.start, calendar).map((date) => ({
        date,
        start: p.start,
        end: p.end,
        room: p.room,
      })),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
}
export function overlaps(a: Occurrence, b: Occurrence) {
  return (
    a.date === b.date &&
    a.room === b.room &&
    minutes(a.start) < minutes(b.end) &&
    minutes(b.start) < minutes(a.end)
  );
}
export function available(
  pattern: Pattern,
  room: string,
  bookings: Booking[],
  schedule: Schedule = defaultSchedule,
  calendar: CalendarConfig = initialCalendar,
) {
  return !expand([{ ...pattern, room }], schedule, calendar).some((a) =>
    bookings.some((b) =>
      b.occurrences.some((o) => !o.cancelled && overlaps(a, o)),
    ),
  );
}
export function validateBooking(
  booking: Booking,
  existing: Booking[],
  inventory: Room[] = rooms,
  calendar: CalendarConfig = initialCalendar,
): string | null {
  if (
    !booking.subject.trim() ||
    !new RegExp(`^\\d{3,}-.+-${calendar.year}$`).test(booking.course) ||
    !booking.teacher
  )
    return "Completá la materia, el curso y el docente.";
  if (
    !Number.isInteger(booking.students) ||
    booking.students < 1 ||
    !booking.occurrences.length
  )
    return "Indicá alumnos y al menos un día de clase.";
  const invalidDates = validateDates(booking.occurrences, undefined, calendar);
  if (invalidDates) return invalidDates;
  for (const o of booking.occurrences) {
    const room = inventory.find((r) => r.id === o.room);
    if (room?.state && room.state !== "Habilitada")
      return "El aula ya no está habilitada para reservas.";
    if (!room || room.capacity < booking.students)
      return "El aula debe tener capacidad para todos los alumnos previstos.";
    if (booking.type && !compatible(room, { ...booking, type: booking.type }))
      return "El aula ya no cumple el tipo o equipamiento solicitado.";
    if (
      minutes(o.start) < 420 ||
      minutes(o.end) > 1380 ||
      minutes(o.start) >= minutes(o.end) ||
      minutes(o.start) % 30 ||
      minutes(o.end) % 30
    )
      return "Usá horarios de 07:00 a 23:00, en intervalos de 30 minutos.";
    if (
      existing.some((b) =>
        b.occurrences.some((other) => !other.cancelled && overlaps(o, other)),
      )
    )
      return "La disponibilidad cambió. Volvé a elegir las aulas; no se guardó ninguna clase.";
  }
  return null;
}
const bookingFixtures: Booking[] = [
  {
    id: "R-001",
    subject: "Historia",
    course: "004-A-2026",
    teacher: "Sofía Paz",
    students: 60,
    occurrences: [
      { date: "2026-09-14", start: "13:00", end: "14:30", room: "108" },
    ],
  },
  {
    id: "R-002",
    subject: "Física I",
    course: "003-A-2026",
    teacher: "Ana Ruiz",
    students: 36,
    occurrences: [
      { date: "2026-09-14", start: "14:00", end: "15:30", room: "105" },
    ],
  },
  {
    id: "R-003",
    subject: "Álgebra",
    course: "005-A-2026",
    teacher: "Diego Luna",
    students: 40,
    occurrences: [
      { date: "2026-09-14", start: "16:00", end: "17:30", room: "105" },
    ],
  },
  {
    id: "R-004",
    subject: "Programación I",
    course: "006-A-2026",
    teacher: "Martín Díaz",
    students: 24,
    occurrences: [
      { date: "2026-09-14", start: "15:00", end: "17:00", room: "Lab 2" },
    ],
  },
];
export const initialBookings: Booking[] = bookingFixtures.map((b) => ({
  ...b,
  type: rooms.find((r) => r.id === b.occurrences[0]?.room)?.type,
  teacherEmail: teachers.find((t) => t.name === b.teacher)?.email,
  registrant: {
    userId: "bedel",
    name: "Gabriela · Bedel",
    email: "bedel@demo.local",
  },
}));
export const dateLabel = (date: string) =>
  new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
