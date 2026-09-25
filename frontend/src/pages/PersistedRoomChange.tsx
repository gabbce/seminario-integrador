import { useEffect, useState } from "react";
import { api, ApiError } from "../api";
import { type Booking, dateLabel } from "../domain";
import { Button } from "../components/ui/button";
import { FormError } from "../components/FormError";

type Class = {
  id: string;
  date: string;
  start: string;
  end: string;
  room: string;
};
type Room = {
  internalId: string;
  id: string;
  version: number;
  capacity: number;
};
type Group = {
  groupId: string;
  label: string;
  detailIds: string[];
  classes: Class[];
  availableRooms: Room[];
};
type Options = {
  reservationId: string;
  version: number;
  periodic: boolean;
  groups: Group[];
};
type Selection = {
  groupId: string;
  detailIds: string[];
  roomId: string;
  roomVersion: number;
};
type Request = {
  operationId: string;
  version: number;
  selections: Selection[];
};
type Review = {
  reservationId: string;
  version: number;
  changes: (Class & { groupId: string; newRoom: string })[];
};
type Pending = { request: Request; review: Review };
export function PersistedRoomChange({
  booking,
  storageKey,
  back,
}: {
  booking: Booking;
  storageKey: string;
  back: () => void;
}) {
  const [pending, setPending] = useState<Pending | undefined>(() => {
    const value = sessionStorage.getItem(storageKey);
    return value ? JSON.parse(value) : undefined;
  });
  const [options, setOptions] = useState<Options>();
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [review, setReview] = useState<Pending>();
  const [busy, setBusy] = useState(!pending);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const selectedGroups = Object.keys(choices).sort().join(",");
  useEffect(() => {
    if (pending || done) return;
    let active = true;
    api<Options>(`/reservas/${booking.id}/aulas/opciones`, {
      method: "POST",
      body: JSON.stringify({
        version: booking.version,
        selectedGroupIds: selectedGroups ? selectedGroups.split(",") : [],
      }),
    })
      .then(
        (value) => {
          if (active) {
            setOptions(value);
          }
        },
        (e: Error) => {
          if (active) setError(e.message);
        },
      )
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [booking.id, booking.version, pending, done, attempt, selectedGroups]);
  async function prepare() {
    if (!options) return;
    setError("");
    const selections: Selection[] = [];
    for (const group of options.groups) {
      if (!(group.groupId in choices)) continue;
      const room = group.availableRooms.find(
        (r) => r.internalId === choices[group.groupId],
      );
      if (!room) {
        setError("Elegí un aula nueva para cada grupo seleccionado.");
        return;
      }
      selections.push({
        groupId: group.groupId,
        detailIds: group.detailIds,
        roomId: room.internalId,
        roomVersion: room.version,
      });
    }
    if (!selections.length) {
      setError("Seleccioná al menos una clase o patrón para cambiar de aula.");
      return;
    }
    const request = {
      operationId: crypto.randomUUID(),
      version: options.version,
      selections,
    };
    setBusy(true);
    try {
      const value = await api<Review>(
        `/reservas/${booking.id}/aulas/preparacion`,
        { method: "POST", body: JSON.stringify(request) },
      );
      setReview({ request, review: value });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function success() {
    sessionStorage.removeItem(storageKey);
    setPending(undefined);
    setDone(true);
    setError("");
  }
  async function confirm(value: Pending) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(value));
      setPending(value);
      const saved = await api<{ operationId: string }>(
        `/reservas/${booking.id}/aulas/confirmacion`,
        { method: "POST", body: JSON.stringify(value.request) },
      );
      if (saved.operationId !== value.request.operationId)
        throw Error("Respuesta no reconocida");
      success();
    } catch (e) {
      if (e instanceof ApiError && [400, 404, 409].includes(e.status)) {
        sessionStorage.removeItem(storageKey);
        setChoices(
          Object.fromEntries(
            value.request.selections.map((s) => [s.groupId, s.roomId]),
          ),
        );
        setPending(undefined);
        setReview(undefined);
        setError(e.message);
      } else
        setError(
          "No se pudo comprobar el resultado. Conservamos el conjunto y la misma operación para consultar o reintentar.",
        );
    } finally {
      setBusy(false);
    }
  }
  async function recover() {
    if (!pending) return;
    setBusy(true);
    setError("");
    try {
      const result = await api<{
        found: boolean;
        result?: { operationId: string };
      }>(`/reservas/mutaciones/${pending.request.operationId}`);
      if (
        result.found &&
        result.result?.operationId === pending.request.operationId
      )
        success();
      else
        setError(
          "Todavía no hay resultado confirmado. Esto no demuestra un fallo: reintentá la misma operación.",
        );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (done)
    return (
      <section className="panel" role="status">
        <h1>Cambio de aulas confirmado</h1>
        <p>
          Se actualizaron todas las clases revisadas y se conservó el historial.
        </p>
        <Button onClick={back}>Ver detalle actualizado</Button>
      </section>
    );
  const displayed = pending ?? review;
  return (
    <>
      {!pending && (
        <Button variant="ghost" disabled={busy} onClick={back}>
          Volver al detalle
        </Button>
      )}
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {booking.id} · {booking.patterns ? "Periódica" : "Esporádica"}
          </p>
          <h1>
            {pending
              ? "Comprobar cambio de aulas"
              : displayed
                ? "Revisar cambio de aulas"
                : "Cambiar aulas de la reserva"}
          </h1>
          <p>
            {booking.subject} · {booking.course} · {booking.teacher}
          </p>
        </div>
      </div>
      {error && <FormError message={error} />}
      {displayed ? (
        <section className="panel">
          <h2>{displayed.review.changes.length} clases afectadas</h2>
          <p>
            Se conservan fechas y horarios. Las clases iniciadas y canceladas
            mantienen su aula.
          </p>
          {pending && (
            <p>
              El conjunto enviado permanece fijo hasta comprobar el resultado.
            </p>
          )}
          <ul>
            {displayed.review.changes.map((c) => (
              <li key={c.id}>
                {dateLabel(c.date)} · {c.start}–{c.end} · Aula {c.room} →{" "}
                <strong>{c.newRoom}</strong>
              </li>
            ))}
          </ul>
          <div className="change-room-actions">
            {pending ? (
              <>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => void recover()}
                >
                  Consultar resultado
                </Button>
                <Button disabled={busy} onClick={() => void confirm(pending)}>
                  Reintentar mismo cambio
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    setReview(undefined);
                    setError("");
                  }}
                >
                  Modificar selección
                </Button>
                <Button disabled={busy} onClick={() => void confirm(displayed)}>
                  Confirmar cambio de aulas
                </Button>
              </>
            )}
          </div>
        </section>
      ) : options ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void prepare();
          }}
        >
          <section className="panel">
            <h2>
              {options.periodic ? "Patrones semanales" : "Clases futuras"}
            </h2>
            <p>
              {options.periodic
                ? "Cada patrón cambia de aula junto con todas sus clases futuras vigentes, incluidas las reprogramadas."
                : "Seleccioná una o varias clases y elegí un aula disponible para cada fecha."}
            </p>
            <div className="room-mutation-groups">
              {options.groups.map((g, index) => (
                <div className="panel" key={g.groupId}>
                  <label className="date-check">
                    <input
                      type="checkbox"
                      disabled={busy}
                      checked={g.groupId in choices}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setBusy(true);
                        setChoices((old) => {
                          const value = { ...old };
                          if (checked) value[g.groupId] = "";
                          else delete value[g.groupId];
                          return value;
                        });
                        setError("");
                      }}
                    />{" "}
                    {g.label}
                  </label>
                  <p>
                    {g.classes.length}{" "}
                    {g.classes.length === 1 ? "clase" : "clases"} ·{" "}
                    {g.classes
                      .map((c) => `Aula ${c.room}`)
                      .filter((v, i, all) => all.indexOf(v) === i)
                      .join(", ")}
                  </p>
                  <label htmlFor={`room-choice-${index}`}>
                    Nueva aula · {g.label}
                  </label>
                  <select
                    id={`room-choice-${index}`}
                    disabled={busy || !(g.groupId in choices)}
                    value={choices[g.groupId] ?? ""}
                    onChange={(e) => {
                      setChoices((old) => ({
                        ...old,
                        [g.groupId]: e.target.value,
                      }));
                      setError("");
                    }}
                  >
                    <option value="">Seleccioná un aula</option>
                    {g.availableRooms.map((r) => (
                      <option key={r.internalId} value={r.internalId}>
                        Aula {r.id} · {r.capacity} lugares
                      </option>
                    ))}
                  </select>
                  {!g.availableRooms.length && (
                    <p>
                      No hay otra aula compatible y libre para todas estas
                      clases.
                    </p>
                  )}
                </div>
              ))}
            </div>
            <div className="change-room-actions">
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  setAttempt((n) => n + 1);
                }}
              >
                Consultar opciones nuevamente
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Comprobando…" : "Revisar cambio de aulas"}
              </Button>
            </div>
          </section>
        </form>
      ) : (
        <section className="panel">
          <p role="status">
            {busy
              ? "Consultando aulas disponibles…"
              : "No se pudieron cargar las opciones."}
          </p>
          <Button
            disabled={busy}
            onClick={() => {
              setBusy(true);
              setAttempt((n) => n + 1);
            }}
          >
            Reintentar consulta
          </Button>
        </section>
      )}
    </>
  );
}
