import { useState } from "react";
import { type Booking, dateLabel, dayNames, rooms } from "../domain";
import { groupIndices, roomChangeError, type RoomChange } from "../room-change";
import { Button } from "../components/ui/button";
export function ChangeRoom({
  booking,
  bookings,
  save,
  back,
}: {
  booking: Booking;
  bookings: Booking[];
  save: (request: RoomChange) => string | undefined;
  back: () => void;
}) {
  const [snapshot] = useState(booking);
  const groups = snapshot.patterns
    ? snapshot.patterns.map((p) => ({
        key: p.day,
        label: `${dayNames[p.day]} ${p.start}–${p.end}`,
        room: p.room,
      }))
    : snapshot.occurrences.map((o, i) => ({
        key: i,
        label: `${dateLabel(o.date)} ${o.start}–${o.end}`,
        room: o.room,
      }));
  const eligible = groups.filter((g) => groupIndices(snapshot, g.key).length);
  const [group, setGroup] = useState(eligible[0]?.key ?? -1);
  const [room, setRoom] = useState("");
  const [error, setError] = useState("");
  const indices = groupIndices(snapshot, group);
  const original = groups.find((g) => g.key === group)?.room;
  const request = { version: snapshot.version ?? 0, group, room, indices };
  const choices = rooms.filter(
    (r) =>
      r.id !== original &&
      !roomChangeError(snapshot, { ...request, room: r.id }, bookings),
  );
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
          <h1>Cambiar aula de la reserva</h1>
          <p>
            {snapshot.subject} · {snapshot.course} · {snapshot.teacher} ·{" "}
            {snapshot.students} alumnos previstos
          </p>
        </div>
      </div>
      <section className="panel">
        <h2>Grupos de la reserva</h2>
        <div className="cancel-selection">
          {eligible.map((g) => (
            <Button
              key={g.key}
              variant={group === g.key ? "default" : "outline"}
              aria-pressed={group === g.key}
              onClick={() => {
                setGroup(g.key);
                setRoom("");
                setError("");
              }}
            >
              {g.label}
            </Button>
          ))}
        </div>
        <p className="notice">
          El cambio afectará {indices.length} clases futuras
          {snapshot.patterns ? ` del grupo ${dayNames[group]}` : ""}. Las clases
          iniciadas, canceladas y los demás grupos conservan su aula.
        </p>
        <div className="cancellation-layout">
          <section className="panel">
            <h2>Comparación</h2>
            <div className="room-comparison">
              <div>
                <p>Aula actual</p>
                <h2>{original}</h2>
                <p>{rooms.find((r) => r.id === original)?.capacity} personas</p>
              </div>
              <span aria-hidden="true">→</span>
              <div>
                <p>Nueva aula</p>
                <h2>{room || "Por elegir"}</h2>
                <p>
                  {room &&
                    `${rooms.find((r) => r.id === room)?.capacity} personas`}
                </p>
              </div>
            </div>
          </section>
          <section>
            <fieldset>
              <legend>Elegí una nueva aula disponible</legend>
              {choices.map((r) => (
                <label className="change-room-option" key={r.id}>
                  <input
                    type="radio"
                    name="new-room"
                    checked={room === r.id}
                    onChange={() => setRoom(r.id)}
                  />
                  <span>
                    <strong>Aula {r.id}</strong> · {r.capacity} personas
                    <small>
                      Disponible en las {indices.length} fechas · {r.type}
                    </small>
                  </span>
                </label>
              ))}
            </fieldset>
            {!choices.length && (
              <p role="status">
                No hay otra aula compatible disponible para todas estas clases.
              </p>
            )}
            <details>
              <summary>Ver las {indices.length} fechas afectadas</summary>
              {indices.map((i) => (
                <p key={i}>
                  {dateLabel(snapshot.occurrences[i].date)} ·{" "}
                  {snapshot.occurrences[i].start}–{snapshot.occurrences[i].end}
                </p>
              ))}
            </details>
          </section>
        </div>
      </section>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="change-room-actions">
        <Button variant="outline" onClick={back}>
          Descartar cambios
        </Button>
        <Button
          disabled={!room}
          onClick={() => {
            const failure = save(request);
            if (failure) setError(failure);
          }}
        >
          Guardar cambio de aula
        </Button>
      </div>
    </>
  );
}
