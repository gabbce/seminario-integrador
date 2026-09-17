import { useEffect, useState } from "react";
import { api } from "../api";
import type { CalendarConfig } from "../calendar";
import { AdminNav } from "../components/AdminNav";
import { FormError } from "../components/FormError";
import { Button } from "../components/ui/button";
import { CalendarEditor } from "./CalendarEditor";

export type PersistedCalendarConfig = CalendarConfig & { id: string };
const failureMessage = (error: unknown) =>
  error instanceof Error ? error.message : "No se pudo completar la operación.";

export default function PersistedCalendar({
  onChanged,
}: { onChanged?: () => void } = {}) {
  const [calendars, setCalendars] = useState<PersistedCalendarConfig[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [newYear, setNewYear] = useState(new Date().getFullYear());
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    api<PersistedCalendarConfig[]>("/referencias/calendarios")
      .then((items) => {
        if (active) {
          setCalendars(items);
          setSelectedId(items.at(-1)?.id);
        }
      })
      .catch((error: unknown) => {
        if (active) setError(failureMessage(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  const selected =
    calendars.find((calendar) => calendar.id === selectedId) ?? calendars[0];
  function changed(items: PersistedCalendarConfig[], id?: string) {
    setCalendars(items.toSorted((a, b) => a.year - b.year));
    setSelectedId(id ?? items.at(-1)?.id);
    setError("");
    window.dispatchEvent(new Event("aulas-calendar-refresh"));
    onChanged?.();
  }
  async function create(year: number) {
    try {
      const saved = await api<PersistedCalendarConfig>(
        "/administracion/calendarios",
        { method: "POST", body: JSON.stringify({ year }) },
      );
      changed([...calendars, saved], saved.id);
      setMessage("Año creado.");
    } catch (error) {
      return failureMessage(error);
    }
  }
  async function reload() {
    setLoading(true);
    setMessage("");
    try {
      const items = await api<PersistedCalendarConfig[]>(
        "/referencias/calendarios",
      );
      setCalendars(items);
      setError("");
      window.dispatchEvent(new Event("aulas-calendar-refresh"));
      onChanged?.();
    } catch (error) {
      setError(failureMessage(error));
    } finally {
      setLoading(false);
    }
  }
  if (loading)
    return (
      <>
        <AdminNav />
        <h1>Calendario académico</h1>
        <p role="status">Cargando calendario…</p>
      </>
    );
  return (
    <>
      {selected ? (
        <CalendarEditor
          key={`${selected.id}-${selected.version}`}
          calendar={selected}
          calendars={calendars}
          selectYear={(year) => {
            setSelectedId(
              calendars.find((calendar) => calendar.year === year)?.id,
            );
            setMessage("");
          }}
          addYear={create}
          deleteYear={async () => {
            try {
              await api<void>(
                `/administracion/calendarios/${selected.id}?version=${selected.version}`,
                { method: "DELETE" },
              );
              changed(
                calendars.filter((calendar) => calendar.id !== selected.id),
              );
              setMessage("Año eliminado.");
            } catch (error) {
              return failureMessage(error);
            }
          }}
          save={async (proposal) => {
            try {
              const saved = await api<PersistedCalendarConfig>(
                `/administracion/calendarios/${selected.id}`,
                { method: "PUT", body: JSON.stringify(proposal) },
              );
              changed(
                calendars.map((calendar) =>
                  calendar.id === saved.id ? saved : calendar,
                ),
                saved.id,
              );
              setMessage("Calendario actualizado.");
            } catch (error) {
              return failureMessage(error);
            }
          }}
          reload={() => void reload()}
          persisted
        />
      ) : (
        <>
          <AdminNav />
          <div className="page-heading">
            <div>
              <p className="eyebrow">Administración</p>
              <h1>Calendario académico</h1>
              <p>Cuatrimestres y fechas no lectivas</p>
            </div>
          </div>
          {!error && <p>No hay años lectivos registrados.</p>}
          <form
            className="panel year-selection"
            onSubmit={async (event) => {
              event.preventDefault();
              setBusy(true);
              setError("");
              const failure = await create(newYear);
              if (failure) setError(failure);
              setBusy(false);
            }}
          >
            <label>
              Nuevo año
              <input
                type="number"
                min="1"
                max="9999"
                required
                disabled={busy}
                value={newYear}
                onChange={(event) => setNewYear(Number(event.target.value))}
              />
            </label>
            <Button type="submit" disabled={busy}>
              {busy ? "Creando…" : "Crear año"}
            </Button>
          </form>
        </>
      )}
      {error && <FormError message={error} />}
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      {!selected && (
        <Button variant="outline" onClick={() => void reload()}>
          Recargar calendario
        </Button>
      )}
    </>
  );
}
