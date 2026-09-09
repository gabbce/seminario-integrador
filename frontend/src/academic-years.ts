import { type CalendarConfig, emptyCalendar } from "./calendar";
import type { Booking, Role } from "./domain";
import type { Course } from "./catalog";
export function addYear(
  calendars: CalendarConfig[],
  year: number,
  role: Role,
):
  | { calendars: CalendarConfig[]; error?: never }
  | { error: string; calendars?: never } {
  if (role !== "Administrador")
    return { error: "Solo Administración puede crear años." };
  if (
    !Number.isInteger(year) ||
    year < 1900 ||
    year > 9999 ||
    calendars.some((c) => c.year === year)
  )
    return { error: "Indicá un año válido que no exista." };
  return {
    calendars: [...calendars, emptyCalendar(year)].sort(
      (a, b) => a.year - b.year,
    ),
  };
}
export function deleteYear(
  calendars: CalendarConfig[],
  year: number,
  bookings: Booking[],
  courses: Course[],
  role: Role,
):
  | { calendars: CalendarConfig[]; error?: never }
  | { error: string; calendars?: never } {
  const current = calendars.find((c) => c.year === year);
  if (
    role !== "Administrador" ||
    !current ||
    current.state !== "En preparación"
  )
    return { error: "Solo se puede eliminar un año en preparación." };
  if (
    Object.values(current.terms).some((range) => range.some(Boolean)) ||
    current.holidays.length ||
    bookings.some((b) =>
      b.occurrences.some((o) => o.date.startsWith(`${year}-`)),
    ) ||
    courses.some((c) => c.year === year)
  )
    return {
      error:
        "El año tiene cuatrimestres, fechas no lectivas, cursos o reservas asociados.",
    };
  return { calendars: calendars.filter((c) => c.year !== year) };
}
export function bookingYear(b: Booking) {
  return b.schedule?.year ?? Number(b.occurrences[0]?.date.slice(0, 4));
}
export function yearMutationError(b: Booking, calendars: CalendarConfig[]) {
  if (calendars.find((c) => c.year === bookingYear(b))?.state !== "Habilitado")
    return "El año no está habilitado para modificar reservas.";
}
