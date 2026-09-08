import { holidays } from "./calendar";
export function weekDates(date: string): string[] {
  const day = new Date(`${date}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(day);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}
export function closedDay(date: string): string | null {
  if (!date.startsWith("2026-")) return "Año no habilitado para reservas";
  if ([0, 6].includes(new Date(`${date}T12:00:00Z`).getUTCDay()))
    return "Fuera de los días de apertura";
  if (holidays.includes(date)) return "Fecha no lectiva";
  return null;
}
