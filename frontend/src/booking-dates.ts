import { demoNow, initialCalendar, type CalendarConfig } from "./calendar";
import { minutes, type Occurrence } from "./domain";
export function validateDates(
  dates: Occurrence[],
  now = demoNow,
  calendar: CalendarConfig = initialCalendar,
): string | null {
  if (calendar.state !== "Habilitado")
    return "El año no está habilitado para reservas.";
  if (!dates.length) return "Agregá al menos una fecha.";
  if (new Set(dates.map((o) => o.date)).size !== dates.length)
    return "Cada fecha debe aparecer una sola vez.";
  for (const o of dates) {
    const d = new Date(`${o.date}T12:00:00Z`);
    if (
      !new RegExp(`^${calendar.year}-\\d{2}-\\d{2}$`).test(o.date) ||
      Number.isNaN(d.getTime()) ||
      d.toISOString().slice(0, 10) !== o.date
    )
      return "Elegí fechas válidas del año habilitado seleccionado.";
    if ([0, 6].includes(d.getUTCDay()))
      return "Solo se puede reservar de lunes a viernes.";
    if (calendar.holidays.includes(o.date))
      return `${o.date} es una fecha no lectiva.`;
    if (`${o.date}T${o.start}` <= now)
      return "El inicio debe ser posterior al momento actual de la institución.";
    if (
      !/^\d{2}:(00|30)$/.test(o.start) ||
      !/^\d{2}:(00|30)$/.test(o.end) ||
      minutes(o.start) < 420 ||
      minutes(o.end) > 1380 ||
      minutes(o.start) >= minutes(o.end)
    )
      return "Usá horarios de 07:00 a 23:00 en módulos de 30 minutos.";
  }
  return null;
}
