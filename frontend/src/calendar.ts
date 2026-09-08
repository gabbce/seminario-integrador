import type { Pattern } from "./domain";
export type Period = "first" | "second" | "annual";
export type Schedule = { period: Period; excluded: string[] };
export const demoNow = "2026-09-08T10:00";
export const holidays = ["2026-10-12", "2026-11-23"];
export const defaultSchedule: Schedule = { period: "second", excluded: [] };
export const terms = {
  first: ["2026-03-09", "2026-07-03"],
  second: ["2026-09-14", "2026-12-18"],
} as const;
export const periodLabels = {
  first: "1.º cuatrimestre · 2026",
  second: "2.º cuatrimestre · 2026",
  annual: "Anual · 2026",
};
export function candidateDates(day: number, period: Period): string[] {
  const ranges =
    period === "annual" ? [terms.first, terms.second] : [terms[period]];
  return ranges.flatMap(([from, to]) => {
    const dates: string[] = [];
    for (
      const d = new Date(`${from}T12:00:00Z`);
      d <= new Date(`${to}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() + 1)
    ) {
      if (d.getUTCDay() === day) dates.push(d.toISOString().slice(0, 10));
    }
    return dates;
  });
}
export function omission(
  date: string,
  start: string,
  schedule: Schedule,
): string | null {
  if (`${date}T${start}` <= demoNow) return "Ya iniciada";
  if (holidays.includes(date)) return "Fecha no lectiva";
  if (schedule.excluded.includes(date)) return "Exclusión manual";
  return null;
}
export function omittedDates(patterns: Pattern[], schedule: Schedule) {
  return patterns
    .flatMap((p) =>
      candidateDates(p.day, schedule.period).flatMap((date) => {
        const reason = omission(date, p.start, schedule);
        return reason ? [{ date, reason }] : [];
      }),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
}
