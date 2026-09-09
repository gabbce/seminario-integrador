import { useState } from "react";
import { type Booking, dateLabel, minutes } from "../domain";
import { isFuture } from "../cancellation";
import type { Reschedule as Request } from "../reschedule";
import { Button } from "../components/ui/button";
export function Reschedule({
  booking,
  save,
  check,
  back,
}: {
  booking: Booking;
  check: (request: Request) => string | undefined;
  save: (request: Request) => string | undefined;
  back: () => void;
}) {
  const [snapshot] = useState(booking);
  const [dates, setDates] = useState<Request["dates"]>([]);
  const [error, setError] = useState("");
  const [review, setReview] = useState(false);
  function update(index: number, patch: Partial<Request["dates"][number]>) {
    setDates((old) =>
      old.map((d) => (d.index === index ? { ...d, ...patch } : d)),
    );
    setError("");
  }
  const clock = (n: number) =>
    `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
  return (
    <>
      <Button variant="ghost" onClick={back}>
        Volver al detalle
      </Button>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {snapshot.id} · {snapshot.patterns ? "Periódica" : "Esporádica"}
          </p>
          <h1>Reprogramar clases</h1>
          <p>
            {snapshot.subject} · {snapshot.course} · {snapshot.teacher}
          </p>
        </div>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!review) {
            const failure = check({ version: snapshot.version ?? 0, dates });
            if (failure) {
              setError(failure);
              return;
            }
            setError("");
            setReview(true);
            return;
          }
          const failure = save({ version: snapshot.version ?? 0, dates });
          if (failure) setError(failure);
        }}
      >
        <section className="panel">
          <h2>
            {review
              ? "Revisar nuevas fechas"
              : "Seleccionar clases y nuevos horarios"}
          </h2>
          <p>
            Se conserva el aula de cada clase.
            {snapshot.patterns
              ? " Las fechas deben quedar dentro de los períodos asignados; el patrón semanal no cambia."
              : ""}
          </p>
          {!review &&
            snapshot.occurrences.map((o, index) => {
              const selected = dates.find((d) => d.index === index);
              return (
                <fieldset key={index} className="reschedule-row">
                  <legend>
                    {dateLabel(o.date)} · {o.start}–{o.end} · Aula {o.room}
                  </legend>
                  <label className="reschedule-select">
                    <input
                      type="checkbox"
                      disabled={o.cancelled || !isFuture(o)}
                      checked={!!selected}
                      onChange={(e) =>
                        setDates(
                          e.target.checked
                            ? [
                                ...dates,
                                {
                                  index,
                                  date: o.date,
                                  start: o.start,
                                  end: o.end,
                                },
                              ]
                            : dates.filter((d) => d.index !== index),
                        )
                      }
                    />
                    Reprogramar esta clase
                    {o.cancelled
                      ? " (cancelada)"
                      : !isFuture(o)
                        ? " (iniciada o pasada)"
                        : ""}
                  </label>
                  {selected && (
                    <div className="form-grid">
                      <label>
                        Nueva fecha
                        <input
                          type="date"
                          required
                          min="2026-01-01"
                          max="2026-12-31"
                          value={selected.date}
                          onChange={(e) =>
                            update(index, { date: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        Nuevo inicio
                        <input
                          type="time"
                          required
                          step="1800"
                          min="07:00"
                          max="22:30"
                          value={selected.start}
                          onChange={(e) =>
                            update(index, {
                              start: e.target.value,
                              end: clock(
                                minutes(e.target.value) +
                                  minutes(selected.end) -
                                  minutes(selected.start),
                              ),
                            })
                          }
                        />
                      </label>
                      <label>
                        Duración
                        <select
                          value={
                            minutes(selected.end) - minutes(selected.start)
                          }
                          onChange={(e) =>
                            update(index, {
                              end: clock(
                                minutes(selected.start) +
                                  Number(e.target.value),
                              ),
                            })
                          }
                        >
                          {Array.from(
                            { length: 32 },
                            (_, i) => (i + 1) * 30,
                          ).map((n) => (
                            <option key={n} value={n}>
                              {n / 60} h
                            </option>
                          ))}
                        </select>
                      </label>
                      <p>
                        Finaliza: <strong>{selected.end}</strong>
                      </p>
                    </div>
                  )}
                </fieldset>
              );
            })}
          {review &&
            dates.map((d) => (
              <article className="reschedule-row" key={d.index}>
                <div className="cancellation-layout">
                  <section className="panel">
                    <h2>Antes</h2>
                    <p>{dateLabel(snapshot.occurrences[d.index].date)}</p>
                    <strong>
                      {snapshot.occurrences[d.index].start}–
                      {snapshot.occurrences[d.index].end} · Aula{" "}
                      {snapshot.occurrences[d.index].room}
                    </strong>
                  </section>
                  <section className="panel">
                    <h2>Después</h2>
                    <p>{dateLabel(d.date)}</p>
                    <strong>
                      {d.start}–{d.end} · Aula{" "}
                      {snapshot.occurrences[d.index].room}
                    </strong>
                    <p>Se conserva el aula.</p>
                  </section>
                </div>
              </article>
            ))}
          {review && (
            <p className="notice">
              Disponibilidad verificada para la selección. Se volverá a
              comprobar al guardar.
            </p>
          )}
        </section>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="change-room-actions">
          <Button
            type="button"
            variant="outline"
            onClick={() => (review ? setReview(false) : back())}
          >
            {review ? "Corregir fechas" : "Descartar cambios"}
          </Button>
          <Button type="submit" disabled={!dates.length}>
            {review ? "Guardar reprogramación" : "Revisar reprogramación"}
          </Button>
        </div>
      </form>
    </>
  );
}
