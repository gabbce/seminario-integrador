import { useEffect, useState } from "react";
import { api, ApiError } from "../api";
import type { CalendarImpact } from "../calendar-management";
import { dateLabel } from "../domain";
import type { CalendarConfig } from "../calendar";
import { AdminNav } from "../components/AdminNav";
import { FormError } from "../components/FormError";
import { Button } from "../components/ui/button";
import { CalendarEditor } from "./CalendarEditor";

export type PersistedCalendarConfig = CalendarConfig & { id: string };
const failureMessage = (error: unknown) =>
  error instanceof Error ? error.message : "No se pudo completar la operación.";

type Review = Omit<CalendarImpact, "bookings"> & { stamp: string };
type Pending = {
  id: string;
  request: { operationId: string; proposal: CalendarConfig; stamp: string };
  review: Review;
};
type Result = { calendar: PersistedCalendarConfig };
export default function PersistedCalendar({
  onChanged,
  actorId,
}: {
  onChanged?: () => void;
  actorId: string;
}) {
  const storageKey = `aulas-calendar:${actorId}`;
  const [restored] = useState<Pending | undefined>(() => {
    try {
      return (
        JSON.parse(sessionStorage.getItem(storageKey) ?? "null") ?? undefined
      );
    } catch {
      return undefined;
    }
  });
  const [pending, setPending] = useState(restored);
  const [reviewed, setReviewed] = useState<Review>();
  const [restoredProposal, setRestoredProposal] = useState(
    restored?.request.proposal,
  );
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  function clearPending() {
    sessionStorage.removeItem(storageKey);
    setPending(undefined);
  }

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
          setSelectedId(restored?.id ?? items.at(-1)?.id);
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
  }, [restored]);
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
    setReviewed(undefined);
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
  function completed(result: Result) {
    clearPending();
    setRestoredProposal(undefined);
    setReviewed(undefined);
    changed(
      calendars.map((c) => (c.id === result.calendar.id ? result.calendar : c)),
      result.calendar.id,
    );
    setMessage("Calendario y clases actualizados.");
  }
  async function confirm(operation: Pending) {
    setRecoveryBusy(true);
    setError("");
    try {
      completed(
        await api<Result>(
          `/administracion/calendarios/${operation.id}/confirmacion`,
          { method: "POST", body: JSON.stringify(operation.request) },
        ),
      );
    } catch (error) {
      const message = failureMessage(error);
      setError(message);
      if (error instanceof ApiError && [400, 404, 409].includes(error.status)) {
        clearPending();
        setRestoredProposal(operation.request.proposal);
        setReviewed(undefined);
      }
      return message;
    } finally {
      setRecoveryBusy(false);
    }
  }
  if (pending)
    return (
      <>
        <AdminNav />
        <h1>Comprobar cambio de calendario</h1>
        <section className="panel calendar-impact">
          <h2>
            Año {pending.request.proposal.year} · {pending.review.added.length}{" "}
            clases nuevas
          </h2>
          <p>
            La propuesta enviada permanece fija hasta comprobar el resultado.
          </p>
          {pending.review.added.map((a) => (
            <p key={`${a.booking}-${a.date}`}>
              Reserva {a.booking} · {dateLabel(a.date)} · {a.start}–{a.end} ·
              Aula {a.room}
            </p>
          ))}
          <div className="change-room-actions">
            <Button
              variant="outline"
              disabled={recoveryBusy || loading}
              onClick={async () => {
                setRecoveryBusy(true);
                setError("");
                try {
                  const result = await api<{ found: boolean; result?: Result }>(
                    `/administracion/calendarios/operaciones/${pending.request.operationId}`,
                  );
                  if (result.found && result.result) completed(result.result);
                  else
                    setError(
                      "Todavía no hay resultado registrado. Conservá esta propuesta y reintentá la misma operación.",
                    );
                } catch (error) {
                  setError(failureMessage(error));
                } finally {
                  setRecoveryBusy(false);
                }
              }}
            >
              Consultar resultado
            </Button>
            <Button
              disabled={recoveryBusy || loading}
              onClick={() => void confirm(pending)}
            >
              Reintentar mismo cambio
            </Button>
          </div>
        </section>
        {error && <FormError message={error} />}
      </>
    );
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
          initial={
            restoredProposal?.year === selected.year
              ? { ...restoredProposal, version: selected.version }
              : undefined
          }
          preview={async (proposal) => {
            try {
              const result = await api<Review>(
                `/administracion/calendarios/${selected.id}/impacto`,
                { method: "POST", body: JSON.stringify(proposal) },
              );
              setReviewed(result);
              return {
                impact: { ...result, bookings: [] },
                stamp: result.stamp,
              };
            } catch (error) {
              return { error: failureMessage(error), stamp: "" };
            }
          }}
          save={async (proposal, stamp) => {
            if (!reviewed || reviewed.stamp !== stamp)
              return "Revisá el impacto antes de confirmar.";
            const operation: Pending = {
              id: selected.id,
              request: { operationId: crypto.randomUUID(), proposal, stamp },
              review: reviewed,
            };
            try {
              sessionStorage.setItem(storageKey, JSON.stringify(operation));
            } catch {
              return "No se pudo conservar la operación. Habilitá el almacenamiento de sesión antes de confirmar.";
            }
            setPending(operation);
            return await confirm(operation);
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
