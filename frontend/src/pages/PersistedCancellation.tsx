import { useState } from "react";
import { api, ApiError } from "../api";
import { type Booking, type Occurrence, dateLabel } from "../domain";
import { isFuture } from "../cancellation";
import { institutionalNow } from "../institutional-time";
import { Button } from "../components/ui/button";
import { FormError } from "../components/FormError";

type Proposal = { version: number; detailIds: string[]; reason: string };
type Review = Proposal & {
  classes: (Occurrence & { id: string })[];
  count: number;
  continuityCancelled: boolean;
};
type Request = Proposal & { operationId: string };
type Result = {
  operationId: string;
  reservationId: string;
  version: number;
  detailIds: string[];
  state: string;
};
type Pending = { request: Request; review: Review };
function readPending(key: string): Pending | undefined {
  const value = sessionStorage.getItem(key);
  return value ? (JSON.parse(value) as Pending) : undefined;
}
export function PersistedCancellation({
  booking: originalBooking,
  storageKey,
  back,
}: {
  booking: Booking;
  storageKey: string;
  back: () => void;
}) {
  const [booking, setBooking] = useState(originalBooking);
  const [initial] = useState(() => readPending(storageKey));
  const [selected, setSelected] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [review, setReview] = useState<Review | undefined>(initial?.review);
  const [pending, setPending] = useState<Request | undefined>(initial?.request);
  const [done, setDone] = useState<Result>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(
    initial
      ? "Hay una cancelación pendiente de comprobar. Recuperá su resultado o reintentá la misma operación."
      : "",
  );
  const future = booking.occurrences.filter(
    (o) => o.id && !o.cancelled && isFuture(o, institutionalNow()),
  );
  const path = `/reservas/${booking.id}/cancelaciones`;
  function succeeded(result: Result) {
    sessionStorage.removeItem(storageKey);
    setPending(undefined);
    setDone(result);
    setError("");
  }
  async function prepare() {
    setBusy(true);
    setError("");
    try {
      const proposal = {
        version: booking.version!,
        detailIds: selected.filter((id) => future.some((o) => o.id === id)),
        reason,
      };
      const data = await api<Review>(`${path}/preparacion`, {
        method: "POST",
        body: JSON.stringify(proposal),
      });
      setReview({ ...proposal, ...data });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function confirm() {
    if (!review || busy) return;
    const request = pending ?? {
      operationId: crypto.randomUUID(),
      version: review.version,
      detailIds: review.classes.map((o) => o.id),
      reason: review.reason,
    };
    setBusy(true);
    setError("");
    try {
      // Persist before sending: reload/navigation must not create a second operation.
      sessionStorage.setItem(storageKey, JSON.stringify({ request, review }));
      setPending(request);
      const result = await api<Result>(`${path}/confirmacion`, {
        method: "POST",
        body: JSON.stringify(request),
      });
      if (!result?.operationId || result.operationId !== request.operationId)
        throw new Error("Respuesta no reconocida.");
      succeeded(result);
    } catch (e) {
      if (e instanceof ApiError && [400, 404, 409].includes(e.status)) {
        sessionStorage.removeItem(storageKey);
        setPending(undefined);
        setReview(undefined);
        setError(
          `${e.message} Volvé al detalle para consultar el estado actual; se conserva tu selección.`,
        );
        if (e.status === 409) {
          try {
            const updated = await api<Booking>(`/reservas/${booking.id}`);
            setBooking(updated);
            setSelected((ids) =>
              ids.filter((id) =>
                updated.occurrences.some(
                  (o) =>
                    o.id === id &&
                    !o.cancelled &&
                    isFuture(o, institutionalNow()),
                ),
              ),
            );
          } catch {
            // The detail action remains available if the refresh cannot be completed.
          }
        }
      } else {
        setError(
          "No se pudo comprobar el resultado. Conservamos la misma operación: consultá su estado o reintentá sin cambiar las clases ni el motivo.",
        );
      }
    } finally {
      setBusy(false);
    }
  }
  async function recover() {
    if (!pending) return;
    setBusy(true);
    setError("");
    try {
      const data = await api<{ found: boolean; result?: Result }>(
        `/reservas/mutaciones/${pending.operationId}`,
      );
      if (data.found && data.result?.operationId === pending.operationId)
        succeeded(data.result);
      else
        setError(
          "Todavía no hay resultado confirmado. Esto no demuestra que haya fallado: reintentá la misma operación.",
        );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {booking.id} · {booking.subject}
          </p>
          <h1>
            {done
              ? "Cancelación confirmada"
              : review
                ? "Revisar cancelación"
                : "Cancelar clases"}
          </h1>
          <p>
            {booking.course} · {booking.teacher}
          </p>
        </div>
      </div>
      {done ? (
        <section className="panel" role="status">
          <h2>
            {done.detailIds.length === 1
              ? "Se canceló 1 clase"
              : `Se cancelaron ${done.detailIds.length} clases`}
          </h2>
          <p>Sus horarios quedaron disponibles; se conservó el historial.</p>
          <Button onClick={back}>Ver detalle actualizado</Button>
        </section>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void (review ? confirm() : prepare());
          }}
        >
          <div className="cancellation-layout">
            <section className="panel">
              <h2>{review ? "Clases a cancelar" : "Seleccionar clases"}</h2>
              {!review && (
                <div className="cancel-selection">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => setSelected(future.map((o) => o.id!))}
                  >
                    Todas las futuras ({future.length})
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => setSelected([])}
                  >
                    Quitar selección
                  </Button>
                </div>
              )}
              <div className="booking-occurrences">
                {review
                  ? review.classes.map((o) => (
                      <article key={o.id}>
                        <div>
                          <strong>{dateLabel(o.date)}</strong>
                          <span>
                            {o.start}–{o.end} · Aula {o.room}
                          </span>
                        </div>
                      </article>
                    ))
                  : booking.occurrences.map((o) => (
                      <label key={o.id} className="cancel-choice">
                        <input
                          type="checkbox"
                          aria-label={`Cancelar ${dateLabel(o.date)}`}
                          disabled={busy || !future.includes(o)}
                          checked={selected.includes(o.id!)}
                          onChange={(e) =>
                            setSelected(
                              e.target.checked
                                ? [...selected, o.id!]
                                : selected.filter((id) => id !== o.id),
                            )
                          }
                        />
                        <span>
                          <strong>{dateLabel(o.date)}</strong>
                          <span>
                            {o.start}–{o.end} · Aula {o.room}
                          </span>
                          {!future.includes(o) && (
                            <small>
                              {o.cancelled
                                ? "Ya cancelada"
                                : "Iniciada o pasada: protegida"}
                            </small>
                          )}
                        </span>
                      </label>
                    ))}
              </div>
            </section>
            <section className="panel cancellation-summary">
              {review ? (
                <>
                  <h2>Motivo de cancelación</h2>
                  <p>{review.reason}</p>
                </>
              ) : (
                <>
                  <label htmlFor="cancel-reason">Motivo de cancelación *</label>
                  <textarea
                    id="cancel-reason"
                    required
                    maxLength={1000}
                    value={reason}
                    disabled={busy}
                    onChange={(e) => setReason(e.target.value)}
                    rows={5}
                  />
                </>
              )}
              <div className="cancellation-warning">
                <strong>
                  {(review?.count ?? selected.length) === 1
                    ? "Se cancelará 1 clase"
                    : `Se cancelarán ${review?.count ?? selected.length} clases`}
                </strong>
                {review?.continuityCancelled && (
                  <p>
                    Se cancelará toda la continuidad futura de esta reserva
                    periódica. Los cambios de calendario no agregarán nuevas
                    clases.
                  </p>
                )}
              </div>
              <p>
                El horario del aula quedará disponible. No se puede reactivar
                una clase cancelada.
              </p>
              {error && <FormError message={error} />}
              {pending && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void recover()}
                >
                  Consultar resultado
                </Button>
              )}
              <Button
                type="submit"
                className="cancel-confirm"
                disabled={
                  busy || (!review && (!selected.length || !reason.trim()))
                }
              >
                {busy
                  ? "Comprobando…"
                  : pending
                    ? "Reintentar misma cancelación"
                    : review
                      ? "Confirmar cancelación"
                      : "Revisar cancelación"}
              </Button>
              {!pending && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => (review ? setReview(undefined) : back())}
                >
                  {review ? "Corregir selección" : "Volver al detalle"}
                </Button>
              )}
            </section>
          </div>
        </form>
      )}
    </>
  );
}
