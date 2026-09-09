import { useRooms } from "../room-context";
import { EditHeader } from "./EditHeader";
import { headerEditable, type HeaderChange } from "../booking-header";
import type { Course } from "../catalog";
import { reschedule as checkReschedule } from "../reschedule";
import { Reschedule } from "./Reschedule";
import type { Reschedule as RescheduleRequest } from "../reschedule";
import { ChangeRoom } from "./ChangeRoom";
import type { RoomChange } from "../room-change";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { type Booking, type Role, dateLabel } from "../domain";
import { bookingState, isFuture, type Cancellation } from "../cancellation";
import { Pending } from "./Pending";
import { Button } from "../components/ui/button";

export function Detail({
  bookings,
  role,
  cancel,
  changeRoom,
  reschedule,
  courses,
  addCourse,
  changeHeader,
}: {
  bookings: Booking[];
  role: Role;
  cancel: (id: string, request: Cancellation) => string | undefined;
  changeRoom: (id: string, request: RoomChange) => string | undefined;
  reschedule: (id: string, request: RescheduleRequest) => string | undefined;
  courses: Course[];
  addCourse: (c: Course) => void;
  changeHeader: (id: string, request: HeaderChange) => string | undefined;
}) {
  const { id } = useParams();
  const b = bookings.find((b) => b.id === id);
  if (!b) return <Pending name="Reserva no encontrada" />;
  return (
    <BookingDetail
      key={b.id}
      booking={b}
      role={role}
      cancel={cancel}
      courses={courses}
      addCourse={addCourse}
      changeHeader={changeHeader}
      reschedule={reschedule}
      changeRoom={changeRoom}
      bookings={bookings}
    />
  );
}
function BookingDetail({
  booking: b,
  bookings,
  role,
  cancel,
  changeRoom,
  reschedule,
  courses,
  addCourse,
  changeHeader,
}: {
  booking: Booking;
  bookings: Booking[];
  role: Role;
  cancel: (id: string, request: Cancellation) => string | undefined;
  changeRoom: (id: string, request: RoomChange) => string | undefined;
  reschedule: (id: string, request: RescheduleRequest) => string | undefined;
  courses: Course[];
  addCourse: (c: Course) => void;
  changeHeader: (id: string, request: HeaderChange) => string | undefined;
}) {
  const inventory = useRooms();
  const [editingHeader, setEditingHeader] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [changingRoom, setChangingRoom] = useState(false);
  const go = useNavigate();
  const [editing, setEditing] = useState(false);
  const [indices, setIndices] = useState<number[]>([]);
  const [reason, setReason] = useState("");
  const [version, setVersion] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const future = b.occurrences.flatMap((o, i) =>
    !o.cancelled && isFuture(o) ? [i] : [],
  );
  const operator = role !== "Docente";
  if (editingHeader)
    return (
      <EditHeader
        booking={b}
        courses={courses}
        addCourse={addCourse}
        back={() => setEditingHeader(false)}
        save={(request) => {
          const failure = changeHeader(b.id, request);
          if (failure) return failure;
          setEditingHeader(false);
          setMessage("Datos de la reserva actualizados.");
        }}
      />
    );
  if (rescheduling)
    return (
      <Reschedule
        check={(request) =>
          checkReschedule(b, request, bookings, role, undefined, inventory)
            .error
        }
        booking={b}
        back={() => setRescheduling(false)}
        save={(request) => {
          const error = reschedule(b.id, request);
          if (error) return error;
          setRescheduling(false);
          setMessage(
            "Reprogramación guardada. Se actualizaron las fechas y los horarios.",
          );
        }}
      />
    );
  if (changingRoom)
    return (
      <ChangeRoom
        booking={b}
        bookings={bookings}
        back={() => setChangingRoom(false)}
        save={(request) => {
          const error = changeRoom(b.id, request);
          if (error) return error;
          setChangingRoom(false);
          setMessage(
            "Cambio de aula guardado. Se actualizaron todas las clases seleccionadas.",
          );
        }}
      />
    );
  return (
    <>
      <Button
        variant="ghost"
        onClick={() => (editing ? setEditing(false) : go("/reservas"))}
      >
        <ChevronLeft />
        {editing ? "Volver al detalle" : "Reservas"}
      </Button>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {b.id} · {bookingState(b)}
          </p>
          <h1>{editing ? "Cancelar clases" : b.subject}</h1>
          <p>
            {editing && `${b.subject} · `}
            {b.course} · {b.teacher} · {b.students} alumnos previstos
          </p>
        </div>
        {!editing && operator && headerEditable(b) && (
          <Button variant="outline" onClick={() => setEditingHeader(true)}>
            Modificar datos
          </Button>
        )}
        {!editing && operator && future.length > 0 && (
          <Button variant="outline" onClick={() => setRescheduling(true)}>
            Reprogramar clases
          </Button>
        )}
        {!editing && operator && future.length > 0 && (
          <Button variant="outline" onClick={() => setChangingRoom(true)}>
            Cambiar aula
          </Button>
        )}
        {!editing && operator && future.length > 0 && (
          <Button
            variant="outline"
            onClick={() => {
              setEditing(true);
              setVersion(b.version ?? 0);
              setIndices([]);
              setReason("");
              setError("");
              setMessage("");
            }}
          >
            Cancelar clases
          </Button>
        )}
      </div>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {!editing && (
        <>
          {operator && b.changes?.length && (
            <section className="panel booking-contacts">
              <h2>Historial de cambios</h2>
              {b.changes.map((change, i) => (
                <p key={i}>
                  {change.description}
                  <br />
                  {change.actor} · {change.at.replace("T", " ")}
                </p>
              ))}
            </section>
          )}
          {operator && (
            <section className="panel booking-contacts">
              <h2>Contactos de la reserva</h2>
              <p>Docente: {b.teacherEmail ?? "Sin correo registrado"}</p>
              <p>
                Registrada por {b.registrant?.name ?? "Sin información"}
                {b.registrant?.inactive ? " (cuenta inactiva)" : ""} ·{" "}
                {b.registrant?.email ?? "Sin correo registrado"}
              </p>
            </section>
          )}
          <section className="panel">
            <h2>{b.occurrences.length} clases registradas</h2>
            <p>
              {future.length} próximas clases vigentes ·{" "}
              {b.patterns ? "Periódica" : "Esporádica"}
            </p>
            <div className="booking-occurrences">
              {b.occurrences.map((o, i) => (
                <article
                  key={i}
                  className={o.cancelled ? "cancelled-occurrence" : ""}
                >
                  <div>
                    <strong>{dateLabel(o.date)}</strong>
                    <span>
                      {o.start}–{o.end} ·{" "}
                      <strong>
                        {o.room.startsWith("Lab") ? o.room : `Aula ${o.room}`}
                      </strong>
                    </span>
                  </div>
                  <span className="eyebrow">
                    {o.cancelled
                      ? "Cancelada"
                      : isFuture(o)
                        ? "Confirmada"
                        : "Iniciada / pasada"}
                  </span>
                  {o.cancellation && (
                    <p>
                      Motivo: {o.cancellation.reason}
                      {operator && (
                        <>
                          <br />
                          {o.cancellation.actor} ·{" "}
                          {o.cancellation.at.replace("T", " ")}
                        </>
                      )}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </section>
        </>
      )}
      {editing && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const failure = cancel(b.id, { indices, reason, version });
            if (failure) {
              setError(failure);
              return;
            }
            setEditing(false);
            setMessage(
              `${indices.length === 1 ? "Se canceló 1 clase" : `Se cancelaron ${indices.length} clases`}. Sus horarios quedaron disponibles; se conservó el historial.`,
            );
          }}
        >
          <div className="cancellation-layout">
            <section className="panel">
              <h2>Seleccionar clases</h2>
              <div className="cancel-selection">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIndices(future)}
                >
                  Todas las futuras ({future.length})
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIndices([])}
                >
                  Quitar selección
                </Button>
              </div>
              <div className="booking-occurrences">
                {b.occurrences.map((o, i) => (
                  <label key={i} className="cancel-choice">
                    <input
                      type="checkbox"
                      disabled={!future.includes(i)}
                      checked={indices.includes(i)}
                      onChange={(e) =>
                        setIndices(
                          e.target.checked
                            ? [...indices, i]
                            : indices.filter((n) => n !== i),
                        )
                      }
                      aria-label={`Cancelar ${dateLabel(o.date)}`}
                    />
                    <span>
                      <strong>{dateLabel(o.date)}</strong>
                      <span>
                        {o.start}–{o.end} · Aula {o.room}
                      </span>
                      {!future.includes(i) && (
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
              <label htmlFor="cancel-reason">Motivo de cancelación *</label>
              <textarea
                id="cancel-reason"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={5}
              />
              <div className="cancellation-warning">
                <strong>
                  {indices.length === 1
                    ? "Se cancelará 1 clase"
                    : `Se cancelarán ${indices.length} clases`}
                </strong>
                <p>
                  Las otras{" "}
                  {b.occurrences.filter((o) => !o.cancelled).length -
                    indices.length}{" "}
                  clases vigentes se mantienen.
                </p>
              </div>
              <p>
                El horario del aula quedará disponible. No se puede reactivar
                una clase cancelada.
              </p>
              {error && (
                <p role="alert" className="error">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                className="cancel-confirm"
                disabled={!indices.length || !reason.trim()}
              >
                Confirmar cancelación
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(false)}
              >
                Volver
              </Button>
            </section>
          </div>
        </form>
      )}
    </>
  );
}
