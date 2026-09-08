import { expand, dateLabel, type Pattern } from "../domain";
import { omittedDates, type Schedule } from "../calendar";
export function ScheduleDates({
  patterns,
  schedule,
  change,
}: {
  patterns: Pattern[];
  schedule: Schedule;
  change: (schedule: Schedule) => void;
}) {
  const eligible = expand(patterns, { ...schedule, excluded: [] });
  const omitted = omittedDates(patterns, schedule);
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
