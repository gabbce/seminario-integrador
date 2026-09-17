import { useState } from "react";
import type { PreparedPattern } from "../periodic-preparation";
import { dateLabel } from "../domain";
import { Button } from "./ui/button";

export function PreparedRoomChoices({
  pattern,
  selected,
  onSelect,
  readOnly,
  showContacts,
}: {
  pattern: PreparedPattern;
  selected: string;
  onSelect: (room: string) => void;
  readOnly: boolean;
  showContacts: boolean;
}) {
  const [all, setAll] = useState(false);
  const rooms = pattern.availableRooms;
  const alternatives = rooms.length ? [] : pattern.alternatives;
  return (
    <>
      {!pattern.dates.length ? (
        <p className="error">
          Este día no tiene clases efectivas. Ajustá el período, los días o las
          exclusiones.
        </p>
      ) : !rooms.length && !pattern.compatibleCount ? (
        <p className="error">
          No hay aulas compatibles con la capacidad, el tipo y los recursos
          solicitados.
        </p>
      ) : !rooms.length ? (
        <div className="conflict-notice">
          <h3>Requieren resolver conflictos</h3>
          <p>
            No hay un aula libre durante todo el período. Estas alternativas son
            informativas: revisá las reservas afectadas y contactá a las
            personas involucradas fuera de la app.
          </p>
        </div>
      ) : null}
      {(all ? alternatives : alternatives.slice(0, 3)).map((alternative) => (
        <article className="conflict-option" key={alternative.room.internalId}>
          <h3>
            Aula {alternative.room.id}{" "}
            <small>
              {alternative.room.capacity} personas · {alternative.room.type}
            </small>
          </h3>
          <p>
            {alternative.group === "WITH_PERIODIC"
              ? `${alternative.periodicMinutes} minutos con periódicas · ${alternative.sporadicDates} ${alternative.sporadicDates === 1 ? "fecha" : "fechas"} con esporádicas`
              : `${alternative.sporadicDates} ${alternative.sporadicDates === 1 ? "fecha afectada" : "fechas afectadas"} · ${alternative.sporadicMinutes} minutos con esporádicas`}
          </p>
          <details>
            <summary>Ver conflictos del aula {alternative.room.id}</summary>
            {alternative.conflicts.map((conflict) => (
              <div
                className="conflict-detail"
                key={`${conflict.reservationId}-${conflict.date}-${conflict.start}`}
              >
                <strong>
                  {conflict.subject} · {conflict.course} · Reserva{" "}
                  {conflict.reservationId}
                </strong>
                <p>
                  {dateLabel(conflict.date)} · {conflict.start}–{conflict.end}
                </p>
                <p>
                  {conflict.overlapMinutes} minutos de interferencia ·{" "}
                  {conflict.overlapStart}–{conflict.overlapEnd}
                </p>
                <p>
                  {conflict.modality === "periodic"
                    ? "Periódica"
                    : "Esporádica"}{" "}
                  · Docente solicitante: {conflict.teacher}
                </p>
                {showContacts && (
                  <>
                    <p>
                      Contacto docente:{" "}
                      {conflict.teacherEmail ?? "No disponible en esta reserva"}
                    </p>
                    <p>
                      Registró:{" "}
                      {conflict.registrant
                        ? `${conflict.registrant.name} · ${conflict.registrant.email}${conflict.registrant.inactive ? " · Usuario inactivo" : ""}`
                        : "Sin información de contacto registrada"}
                    </p>
                  </>
                )}
              </div>
            ))}
          </details>
        </article>
      ))}
      {alternatives.length > 3 && (
        <Button type="button" variant="ghost" onClick={() => setAll(!all)}>
          {all
            ? "Ver primeras tres alternativas"
            : `Ver todas las alternativas (${alternatives.length})`}
        </Button>
      )}
      {(all
        ? rooms
        : rooms.filter((room, index) => index < 3 || room.id === selected)
      ).map((room) => (
        <label
          className={
            selected === room.id ? "room-option selected" : "room-option"
          }
          key={room.internalId}
        >
          {!readOnly && (
            <input
              type="radio"
              name={`room-${pattern.day}`}
              required
              checked={selected === room.id}
              onChange={() => onSelect(room.id)}
            />
          )}
          <div>
            <strong>Aula {room.id}</strong>
            <small>
              {room.capacity} personas · {room.type}
            </small>
          </div>
          <span className="availability">Disponible todo el período</span>
        </label>
      ))}
      {rooms.length > 3 && (
        <Button type="button" variant="ghost" onClick={() => setAll(!all)}>
          {all ? "Ver primeras tres" : `Ver todas (${rooms.length})`}
        </Button>
      )}
    </>
  );
}
