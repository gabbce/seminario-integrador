import { useState } from "react";
import { api, ApiError } from "../api";
import { type Booking, dateLabel, minutes } from "../domain";
import type { Reschedule as Form } from "../reschedule";
import { institutionalNow } from "../institutional-time";
import { Reschedule } from "./Reschedule";
import { Button } from "../components/ui/button";
import { FormError } from "../components/FormError";
type Slot = { date: string; start: string; end: string };
type Review = {
  reservationId: string;
  version: number;
  calendarVersion: number;
  roomVersions: Record<string, number>;
  changes: {
    id: string;
    room: string;
    originalDate: string;
    before: Slot;
    after: Slot;
  }[];
};
type Request = {
  operationId: string;
  version: number;
  dates: { detailId: string; date: string; start: string; modules: number }[];
  calendarVersion: number;
  roomVersions: Record<string, number>;
};
type Pending = { form: Form; request: Request; review: Review };
export function PersistedReschedule({
  booking,
  storageKey,
  back,
}: {
  booking: Booking;
  storageKey: string;
  back: () => void;
}) {
  const [initial] = useState<Pending | undefined>(() => {
    const value = sessionStorage.getItem(storageKey);
    return value ? JSON.parse(value) : undefined;
  });
  // Stored requests identify details; list order may change while a response is uncertain.
  const initialForm: Form | undefined = initial
    ? {
        version: booking.version ?? 0,
        dates: initial.request.dates.map((d) => {
          const end = minutes(d.start) + d.modules * 30;
          return {
            index: booking.occurrences.findIndex((o) => o.id === d.detailId),
            date: d.date,
            start: d.start,
            end: `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`,
          };
        }),
      }
    : undefined;
  const [pending, setPending] = useState(initial);
  const [checked, setChecked] = useState<Pending>();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  function success() {
    sessionStorage.removeItem(storageKey);
    setPending(undefined);
    setDone(true);
    setError("");
  }
  async function prepare(form: Form): Promise<string | undefined> {
    setFormError("");
    setChecked(undefined);
    try {
      const proposal = {
        operationId: crypto.randomUUID(),
        version: form.version,
        dates: form.dates.map((d) => ({
          detailId: booking.occurrences[d.index].id!,
          date: d.date,
          start: d.start,
          modules: (minutes(d.end) - minutes(d.start)) / 30,
        })),
      };
      const review = await api<Review>(
        `/reservas/${booking.id}/reprogramacion/preparacion`,
        { method: "POST", body: JSON.stringify(proposal) },
      );
      setChecked({
        form,
        request: {
          ...proposal,
          calendarVersion: review.calendarVersion,
          roomVersions: review.roomVersions,
        },
        review,
      });
    } catch (e) {
      return (e as Error).message;
    }
  }
  async function confirm(value: Pending): Promise<string | undefined> {
    if (busy) return;
    setBusy(true);
    setError("");
    setFormError("");
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(value));
      setPending(value);
      const result = await api<{ operationId: string }>(
        `/reservas/${booking.id}/reprogramacion/confirmacion`,
        { method: "POST", body: JSON.stringify(value.request) },
      );
      if (result.operationId !== value.request.operationId)
        throw Error("Respuesta no reconocida");
      success();
    } catch (e) {
      if (e instanceof ApiError && [400, 404, 409].includes(e.status)) {
        sessionStorage.removeItem(storageKey);
        setPending(undefined);
        setChecked(undefined);
        setFormError(e.message);
        return e.message;
      }
      setError(
        "No se pudo comprobar el resultado. Conservamos las fechas y la misma operación para consultar o reintentar.",
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
      const data = await api<{
        found: boolean;
        result?: { operationId: string };
      }>(`/reservas/mutaciones/${pending.request.operationId}`);
      if (
        data.found &&
        data.result?.operationId === pending.request.operationId
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
        <h1>Reprogramación confirmada</h1>
        <p>
          Se actualizaron todas las clases revisadas, conservando aula, origen e
          historial.
        </p>
        <Button onClick={back}>Ver detalle actualizado</Button>
      </section>
    );
  return (
    <>
      <div hidden={!!pending}>
        <Reschedule
          booking={booking}
          initial={initialForm}
          externalError={formError}
          now={institutionalNow()}
          back={back}
          check={prepare}
          save={(form) => {
            if (
              !checked ||
              JSON.stringify(checked.form) !== JSON.stringify(form)
            )
              return "Corregí las fechas y revisá nuevamente el conjunto antes de guardar.";
            return confirm(checked);
          }}
        />
      </div>
      {pending && (
        <section className="panel">
          <h1>Comprobar reprogramación</h1>
          <p>
            Las fechas enviadas permanecen fijas hasta comprobar el resultado.
          </p>
          <ul>
            {pending.review.changes.map((c) => (
              <li key={c.id}>
                {dateLabel(c.before.date)} {c.before.start}–{c.before.end} →{" "}
                {dateLabel(c.after.date)} {c.after.start}–{c.after.end} · Aula{" "}
                {c.room}
              </li>
            ))}
          </ul>
          {error && <FormError message={error} />}
          <div className="change-room-actions">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void recover()}
            >
              Consultar resultado
            </Button>
            <Button disabled={busy} onClick={() => void confirm(pending)}>
              Reintentar misma reprogramación
            </Button>
          </div>
        </section>
      )}
    </>
  );
}
