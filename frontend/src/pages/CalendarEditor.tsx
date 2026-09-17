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
  persisted = false,
  reload,
}: {
  calendar: CalendarConfig;
  calendars: CalendarConfig[];
  selectYear: (year: number) => void;
  addYear: (year: number) => string | undefined | Promise<string | undefined>;
  deleteYear: () => string | undefined | Promise<string | undefined>;
  preview?: (proposal: CalendarConfig) => {
    impact?: CalendarImpact;
    error?: string;
    stamp: string;
  };
  save: (
    proposal: CalendarConfig,
    stamp: string,
  ) => string | undefined | Promise<string | undefined>;
  persisted?: boolean;
  reload?: () => void;
}) {
  const [busy, setBusy] = useState(false);
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
  async function mutate(
    action: () => string | undefined | Promise<string | undefined>,
  ) {
    setBusy(true);
    setError("");
    try {
      const failure = await action();
      if (failure) setError(failure);
      return failure;
    } catch {
      const failure =
        "No se pudo guardar. Revisá el estado antes de reintentar.";
      setError(failure);
      return failure;
    } finally {
      setBusy(false);
    }
  }
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
          <p>Organizá los períodos de cursado y las fechas sin clases.</p>
        </div>
        {reload && (
          <Button variant="outline" disabled={busy} onClick={reload}>
            Recargar calendario
          </Button>
        )}
      </div>
      <div className="calendar-year-panels">
        <section
          className="panel calendar-year-current"
          aria-labelledby="viewed-year-title"
        >
          <h2 id="viewed-year-title">Año que estás consultando</h2>
          <p className="muted">Elegí el calendario que querés ver o editar.</p>
          <div className="calendar-year-controls">
            <label>
              Año lectivo
              <select
                aria-label="Año del calendario"
                disabled={busy}
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
            <Button
              variant="outline"
              disabled={busy || calendar.state === "Cerrado"}
              onClick={() => setDeleting(true)}
            >
              Eliminar año
            </Button>
          </div>
          {deleting && (
            <div className="cancellation-warning">
              <p>
                Se eliminará el año {calendar.year} solo si no está cerrado y no
                tiene datos asociados.
              </p>
              <Button
                disabled={busy}
                onClick={async () => {
                  await mutate(deleteYear);
                  setDeleting(false);
                }}
              >
                Confirmar eliminación de año
              </Button>
            </div>
          )}
        </section>
        <section
          className="panel calendar-year-create"
          aria-labelledby="create-year-title"
        >
          <h2 id="create-year-title">Crear otro año lectivo</h2>
          <p className="muted">Agregá un calendario nuevo en preparación.</p>
          <div className="calendar-year-controls">
            <label>
              Nuevo año
              <input
                type="number"
                disabled={busy}
                min="1"
                max="9999"
                value={newYear}
                onChange={(e) => setNewYear(Number(e.target.value))}
              />
            </label>
            <Button
              disabled={busy}
              onClick={() => void mutate(() => addYear(newYear))}
            >
              Crear año
            </Button>
          </div>
        </section>
      </div>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      {error && <FormError message={error} />}
      <form
        className="calendar-editor"
        onSubmit={async (e) => {
          e.preventDefault();
          if (persisted) {
            const failure = await mutate(() => save(draft, ""));
            if (!failure) setMessage("Calendario actualizado.");
            return;
          }
          const result = preview?.(draft);
          if (!result) return;
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
        <fieldset disabled={busy || calendar.state === "Cerrado"}>
          <section className="panel calendar-settings">
            <div>
              <p className="eyebrow">Año lectivo {calendar.year}</p>
              <h2>Configuración del año</h2>
              <p className="muted">Definí el año y su estado de operación.</p>
            </div>
            <div className="calendar-settings-fields">
              {persisted && (
                <label>
                  Número de año
                  <input
                    type="number"
                    min="1"
                    max="9999"
                    required
                    value={draft.year}
                    onChange={(e) =>
                      patch({ ...draft, year: Number(e.target.value) })
                    }
                  />
                </label>
              )}
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
            </div>
          </section>
          <div className="calendar-columns">
            <section className="panel">
              <h2>Cuatrimestres</h2>
              <p className="muted calendar-section-description">
                Establecé el inicio y fin de cada período de cursado.
              </p>
              {(["first", "second"] as const).map((period, index) => (
                <fieldset key={period} className="calendar-term">
                  <legend>{index + 1}.º cuatrimestre</legend>
                  <div className="form-grid">
                    <label>
                      Inicio
                      <input
                        aria-label={`Inicio ${index + 1}`}
                        type="date"
                        required={draft.state === "Habilitado"}
                        min={`${draft.year}-01-01`}
                        max={`${draft.year}-12-31`}
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
                        min={`${draft.year}-01-01`}
                        max={`${draft.year}-12-31`}
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
              {!persisted && (
                <p>
                  Las reservas periódicas se extienden usando el aula de cada
                  patrón semanal. No se recortan clases registradas.
                </p>
              )}
            </section>
            <section className="panel">
              <h2>Fechas no lectivas</h2>
              <p className="muted calendar-section-description">
                Las reservas periódicas omiten estas fechas.
              </p>
              {!draft.holidays.length && (
                <p className="calendar-empty">
                  Todavía no hay fechas no lectivas en este año.
                </p>
              )}
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
                        descriptions: Object.fromEntries(
                          Object.entries(draft.descriptions).filter(
                            ([date]) => date !== day,
                          ),
                        ),
                      })
                    }
                  >
                    Quitar {day}
                  </Button>
                </div>
              ))}
              <div className="calendar-add-date">
                <h3>Agregar una fecha</h3>
                <div className="form-grid">
                  <label>
                    Nueva fecha no lectiva
                    <input
                      type="date"
                      min={`${draft.year}-01-01`}
                      max={`${draft.year}-12-31`}
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
              </div>
            </section>
          </div>
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
                onClick={async () => {
                  const failure = await mutate(() => save(draft, stamp));
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
          <div className="change-room-actions calendar-save-actions">
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
            <Button type="submit">
              {busy
                ? "Guardando…"
                : persisted
                  ? "Guardar calendario"
                  : "Revisar impacto"}
            </Button>
          </div>
        </fieldset>
      </form>
    </>
  );
}
