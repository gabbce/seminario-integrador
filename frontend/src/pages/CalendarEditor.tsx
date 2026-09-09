import { FormError } from "../components/FormError";
import { useState } from "react";
import { type CalendarConfig } from "../calendar";
import { type CalendarImpact } from "../calendar-management";
import { dateLabel } from "../domain";
import { Button } from "../components/ui/button";
import { AdminNav } from "../components/AdminNav";
export function CalendarEditor({
  calendar,
  calendars,
  selectYear,
  addYear,
  deleteYear,
  preview,
  save,
}: {
  calendar: CalendarConfig;
  calendars: CalendarConfig[];
  selectYear: (year: number) => void;
  addYear: (year: number) => string | undefined;
  deleteYear: () => string | undefined;
  preview: (proposal: CalendarConfig) => {
    impact?: CalendarImpact;
    error?: string;
    stamp: string;
  };
  save: (proposal: CalendarConfig, stamp: string) => string | undefined;
}) {
  const [newYear, setNewYear] = useState(calendar.year + 1);
  const [deleting, setDeleting] = useState(false);
  const [draft, setDraft] = useState<CalendarConfig>(() =>
    structuredClone(calendar),
  );
  const [review, setReview] = useState<CalendarImpact>();
  const [stamp, setStamp] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  function patch(proposal: CalendarConfig) {
    setDraft(proposal);
    setReview(undefined);
    setError("");
    setMessage("");
  }
  return (
    <>
      <AdminNav />
      <div className="page-heading">
        <div>
          <p className="eyebrow">Administración · Año {calendar.year}</p>
          <h1>Calendario académico</h1>
          <p>Cuatrimestres y fechas no lectivas</p>
        </div>
      </div>
      <section className="panel year-selection">
        <label>
          Año lectivo
          <select
            aria-label="Año del calendario"
            value={calendar.year}
            onChange={(e) => selectYear(Number(e.target.value))}
          >
            {calendars.map((c) => (
              <option key={c.year} value={c.year}>
                {c.year} · {c.state}
              </option>
            ))}
          </select>
        </label>
        <label>
          Nuevo año
          <input
            type="number"
            min="1900"
            max="9999"
            value={newYear}
            onChange={(e) => setNewYear(Number(e.target.value))}
          />
        </label>
        <Button
          onClick={() => {
            const failure = addYear(newYear);
            if (failure) setError(failure);
          }}
        >
          Crear año
        </Button>
        <Button variant="outline" onClick={() => setDeleting(true)}>
          Eliminar año
        </Button>
        {deleting && (
          <div className="cancellation-warning">
            <p>
              Se eliminará el año {calendar.year} solo si está en preparación y
              no tiene datos asociados.
            </p>
            <Button
              onClick={() => {
                const failure = deleteYear();
                if (failure) setError(failure);
                setDeleting(false);
              }}
            >
              Confirmar eliminación de año
            </Button>
          </div>
        )}
      </section>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const result = preview(draft);
          if (result.error) {
            setError(result.error);
            setReview(undefined);
            return;
          }
          setReview(result.impact);
          setStamp(result.stamp);
          setError("");
        }}
      >
        <fieldset disabled={calendar.state === "Cerrado"}>
          <label>
            Estado del año
            <select
              aria-label="Estado del año"
              value={draft.state}
              onChange={(e) =>
                patch({
                  ...draft,
                  state: e.target.value as CalendarConfig["state"],
                })
              }
            >
              <option>En preparación</option>
              <option>Habilitado</option>
              <option>Cerrado</option>
            </select>
          </label>
          <div className="cancellation-layout">
            <section className="panel">
              <h2>Cuatrimestres</h2>
              {(["first", "second"] as const).map((period, index) => (
                <fieldset key={period} className="reschedule-row">
                  <legend>{index + 1}.º cuatrimestre</legend>
                  <div className="form-grid">
                    <label>
                      Inicio
                      <input
                        aria-label={`Inicio ${index + 1}`}
                        type="date"
                        required={draft.state === "Habilitado"}
                        min={`${calendar.year}-01-01`}
                        max={`${calendar.year}-12-31`}
                        value={draft.terms[period][0]}
                        onChange={(e) =>
                          patch({
                            ...draft,
                            terms: {
                              ...draft.terms,
                              [period]: [
                                e.target.value,
                                draft.terms[period][1],
                              ],
                            },
                          })
                        }
                      />
                    </label>
                    <label>
                      Fin
                      <input
                        aria-label={`Fin ${index + 1}`}
                        type="date"
                        required={draft.state === "Habilitado"}
                        min={`${calendar.year}-01-01`}
                        max={`${calendar.year}-12-31`}
                        value={draft.terms[period][1]}
                        onChange={(e) =>
                          patch({
                            ...draft,
                            terms: {
                              ...draft.terms,
                              [period]: [
                                draft.terms[period][0],
                                e.target.value,
                              ],
                            },
                          })
                        }
                      />
                    </label>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      patch({
                        ...draft,
                        state: "En preparación",
                        terms: { ...draft.terms, [period]: ["", ""] },
                      })
                    }
                  >
                    Quitar cuatrimestre {index + 1}
                  </Button>
                </fieldset>
              ))}
              <p>
                Las reservas periódicas se extienden usando el aula de cada
                patrón semanal. No se recortan clases registradas.
              </p>
            </section>
            <section className="panel">
              <h2>Fechas no lectivas</h2>
              {draft.holidays.map((day) => (
                <div className="holiday-row" key={day}>
                  <div>
                    <strong>{dateLabel(day)}</strong>
                    <label>
                      Descripción
                      <input
                        aria-label={`Descripción ${day}`}
                        value={draft.descriptions[day] ?? ""}
                        onChange={(e) =>
                          patch({
                            ...draft,
                            descriptions: {
                              ...draft.descriptions,
                              [day]: e.target.value,
                            },
                          })
                        }
                      />
                    </label>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      patch({
                        ...draft,
                        holidays: draft.holidays.filter((d) => d !== day),
                      })
                    }
                  >
                    Quitar {day}
                  </Button>
                </div>
              ))}
              <div className="form-grid">
                <label>
                  Nueva fecha no lectiva
                  <input
                    type="date"
                    min={`${calendar.year}-01-01`}
                    max={`${calendar.year}-12-31`}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </label>
                <label>
                  Descripción nueva
                  <input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </label>
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={!date || !description.trim()}
                onClick={() => {
                  if (draft.holidays.includes(date)) {
                    setError("Esa fecha ya existe.");
                    return;
                  }
                  patch({
                    ...draft,
                    holidays: [...draft.holidays, date].sort(),
                    descriptions: {
                      ...draft.descriptions,
                      [date]: description.trim(),
                    },
                  });
                  setDate("");
                  setDescription("");
                }}
              >
                Agregar fecha
              </Button>
            </section>
          </div>
          {error && (
            <FormError message={error} />
          )}
          {review && (
            <section className="panel calendar-impact">
              <h2>Impacto del cambio</h2>
              <p>
                Clases nuevas: {review.added.length}. Se guardarán junto con el
                calendario.
              </p>
              {review.added.length ? (
                <div className="date-list">
                  {review.added.map((o) => (
                    <p key={`${o.booking}-${o.date}`}>
                      {o.booking} · {dateLabel(o.date)} · {o.start}–{o.end} ·
                      Aula {o.room}
                    </p>
                  ))}
                </div>
              ) : (
                <p>
                  No se agregarán clases. Se conserva la programación existente.
                </p>
              )}
              <Button
                type="button"
                onClick={() => {
                  const failure = save(draft, stamp);
                  if (failure) {
                    setError(failure);
                    setReview(undefined);
                    return;
                  }
                  setDraft(review.calendar);
                  setReview(undefined);
                  setMessage("Calendario y clases actualizados.");
                }}
              >
                Confirmar cambio de calendario
              </Button>
            </section>
          )}
          <div className="change-room-actions">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDraft(structuredClone(calendar));
                setReview(undefined);
                setError("");
              }}
            >
              Descartar cambios
            </Button>
            <Button type="submit">Revisar impacto</Button>
          </div>
        </fieldset>
      </form>
    </>
  );
}
