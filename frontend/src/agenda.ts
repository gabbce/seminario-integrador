import { initialCalendar, type CalendarConfig } from "./calendar";
export function weekDates(date: string): string[] {
  const day = new Date(`${date}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(day);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}
export function closedDay(
  date: string,
  calendar: CalendarConfig = initialCalendar,
): string | null {
  if (!date.startsWith(`${calendar.year}-`) || calendar.state !== "Habilitado")
    return "Año no habilitado para reservas";
  if ([0, 6].includes(new Date(`${date}T12:00:00Z`).getUTCDay()))
    return "Fuera de los días de apertura";
  if (calendar.holidays.includes(date)) return "Fecha no lectiva";
  return null;
}

/** Known room history in institutional local time; a whole module must be enabled. */
export function roomModuleState(
  room: import("./domain").Room,
  date: string,
  start: string,
  end: string,
): string {
  const instant = (value: string) => Date.parse(`${value}-03:00`);
  const from = instant(`${date}T${start}:00`),
    to = instant(`${date}T${end}:00`);
  const history = [...(room.history ?? [])].sort((a, b) =>
    a.at.localeCompare(b.at),
  );
  const state = history.filter((h) => instant(h.at) <= from).at(-1);
  if (!state) return "Sin historia conocida";
  if (state.state !== "Habilitada") return state.state;
  if (
    history.some(
      (h) =>
        instant(h.at) > from && instant(h.at) < to && h.state !== "Habilitada",
    )
  )
    return "No habilitada durante toda la franja";
  return "Habilitada";
}

export function roomDayTypes(
  room: import("./domain").Room,
  date: string,
): string[] {
  const history = [...(room.history ?? [])].sort((a, b) =>
    a.at.localeCompare(b.at),
  );
  const first = history.filter((h) => h.at <= `${date}T07:00:00`).at(-1);
  return [
    ...new Set([
      first?.type ?? "Sin historia",
      ...history
        .filter((h) => h.at > `${date}T07:00:00` && h.at < `${date}T23:00:00`)
        .map((h) => h.type),
    ]),
  ];
}

export function roomDaySlots(room: import("./domain").Room, date: string) {
  const time = (n: number) =>
    `${String(7 + Math.floor(n / 2)).padStart(2, "0")}:${n % 2 ? "30" : "00"}`;
  return Array.from({ length: 32 }, (_, index) => ({
    index,
    start: time(index),
    end: time(index + 1),
    state: roomModuleState(room, date, time(index), time(index + 1)),
  }));
}
