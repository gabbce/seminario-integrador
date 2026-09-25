export function institutionalNow(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Argentina/Cordoba",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}T${value("hour")}:${value("minute")}`;
}

/** Audit instants are stored in UTC; present them in institutional time. */
export function institutionalTimestamp(value: string): string {
  if (!/(Z|[+-]\d{2}:\d{2})$/.test(value)) return value.replace("T", " ");
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Cordoba",
    dateStyle: "short",
    timeStyle: "short",
    hourCycle: "h23",
  }).format(new Date(value));
}
