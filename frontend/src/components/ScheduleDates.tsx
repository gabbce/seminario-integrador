import { useCalendar } from "../calendar-context";
import { expand, dateLabel, type Pattern } from "../domain";
import { omittedDates, type Schedule } from "../calendar";
export function ScheduleDates({
  patterns,
  schedule,
  change,
  prepared,
}: {
  prepared?: import("../periodic-preparation").PeriodicPreparation | null;
  patterns: Pattern[];
  schedule: Schedule;
  change: (schedule: Schedule) => void;
}) {
  const calendar = useCalendar(schedule.year);
  const eligible =
    prepared !== undefined
      ? (prepared?.patterns.flatMap((p) =>
          [
            ...p.dates,
            ...p.omitted
              .filter((o) => o.reason === "Exclusión manual")
              .map((o) => o.date),
          ]
            .sort()
            .map((date) => ({ date, start: p.start, end: p.end })),
        ) ?? [])
      : expand(patterns, { ...schedule, excluded: [] }, calendar);
  const omitted =
    prepared !== undefined
      ? (prepared?.patterns.flatMap((p) => p.omitted) ?? [])
      : omittedDates(patterns, schedule, calendar);
  return (
    <details className="schedule-dates">
      <summary>Revisar fechas y exclusiones</summary>
      <p className="muted">
        Desmarcá las fechas que no se deben registrar. No se excluyen conflictos
        automáticamente.
      </p>
      <div className="date-list">
        {eligible.length ? (
          eligible.map((o) => (
            <label className="date-check" key={o.date}>
              <input
                type="checkbox"
                checked={!schedule.excluded.includes(o.date)}
                onChange={(e) =>
                  change({
                    ...schedule,
                    excluded: e.target.checked
                      ? schedule.excluded.filter((d) => d !== o.date)
                      : [...schedule.excluded, o.date],
                  })
                }
              />
              <span>
                {dateLabel(o.date)} · {o.start}–{o.end}
              </span>
            </label>
          ))
        ) : prepared === null ? (
          <p>Consultando las fechas del período…</p>
        ) : (
          <p>No quedan fechas futuras lectivas en el período seleccionado.</p>
        )}
      </div>
      <h3>Fechas omitidas ({omitted.length})</h3>
      <div className="date-list">
        {omitted.map((o) => (
          <p key={o.date}>
            {dateLabel(o.date)} · {o.reason}
          </p>
        ))}
      </div>
    </details>
  );
}
