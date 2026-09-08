import { useState } from "react";
import { roomOptions } from "../availability";
import { dateLabel, type Booking, type Occurrence, type Room } from "../domain";
import { Button } from "./ui/button";
export function RoomChoices({
  request,
  candidates,
  bookings,
  selected,
  onSelect,
  name,
  privateContacts = true,
  readOnly = false,
  mode = "periodic",
}: {
  request: Occurrence[];
  candidates: Room[];
  bookings: Booking[];
  selected: string;
  onSelect: (id: string) => void;
  name: string;
  privateContacts?: boolean;
  readOnly?: boolean;
  mode?: "periodic" | "sporadic";
}) {
  const [all, setAll] = useState(false);
  const options = roomOptions(request, candidates, bookings, mode);
  const free = options.filter((o) => !o.conflicts.length);
  const shown = free.length ? free : options;
  return (
    <>
      {!candidates.length ? (
        <p className="error">
          No hay aulas compatibles con la capacidad y el tipo solicitados.
        </p>
      ) : (
        !free.length && (
          <div className="conflict-notice">
            <h3>Requieren resolver conflictos</h3>
            <p>
              {mode === "periodic"
                ? "No hay un aula libre durante todo el período."
                : "No hay un aula libre para esta fecha y horario."}{" "}
              Estas alternativas son informativas: revisá las reservas afectadas
              y contactá a las personas involucradas fuera de la app.
            </p>
          </div>
        )
      )}
      {(all
        ? shown
        : shown.filter(
            (option, index) => index < 3 || option.room.id === selected,
          )
      ).map((option) =>
        option.conflicts.length ? (
          <article className="conflict-option" key={option.room.id}>
            <h3>
              Aula {option.room.id}{" "}
              <small>
                {option.room.capacity} personas · {option.room.type}
              </small>
            </h3>
            <p>
              {option.periodicMinutes
                ? `${option.periodicMinutes} minutos con periódicas · ${option.sporadicDates} fechas con esporádicas`
                : `${option.sporadicDates} fechas afectadas · ${option.sporadicMinutes} minutos con esporádicas`}
            </p>
            <details>
              <summary>
                {privateContacts ? "Ver reservas y contactos" : "Ver reservas"}
              </summary>
              {option.conflicts.map((c, i) => (
                <div
                  className="conflict-detail"
                  key={`${c.booking.id}-${c.occurrence.date}-${i}`}
                >
                  <strong>
                    {c.booking.subject} · {c.booking.course} · {c.booking.id}
                  </strong>
                  <p>
                    {dateLabel(c.occurrence.date)} · {c.occurrence.start}–
                    {c.occurrence.end} · {c.to - c.from} minutos de
                    interferencia
                  </p>
                  <p>
                    {c.booking.patterns ? "Periódica" : "Esporádica"} · Docente:{" "}
                    {c.booking.teacher}
                  </p>
                  {privateContacts && (
                    <>
                      <p>
                        Contacto docente:{" "}
                        {c.booking.teacherEmail ||
                          "No disponible en esta reserva"}
                      </p>
                      <p>
                        Registró:{" "}
                        {c.booking.registrant
                          ? `${c.booking.registrant.name} · ${c.booking.registrant.email}${c.booking.registrant.inactive ? " · Usuario inactivo" : ""}`
                          : "Sin información de contacto registrada"}
                      </p>
                    </>
                  )}
                </div>
              ))}
            </details>
          </article>
        ) : (
          <label
            className={
              selected === option.room.id
                ? "room-option selected"
                : "room-option"
            }
            key={option.room.id}
          >
            {!readOnly && (
              <input
                type="radio"
                name={name}
                required
                checked={selected === option.room.id}
                onChange={() => onSelect(option.room.id)}
              />
            )}
            <div>
              <strong>Aula {option.room.id}</strong>
              <small>
                {option.room.capacity} personas · {option.room.type}
              </small>
            </div>
            <span className="availability">
              {mode === "periodic"
                ? "Disponible todo el período"
                : "Disponible en esta fecha"}
            </span>
          </label>
        ),
      )}
      {shown.length > 3 && (
        <Button type="button" variant="ghost" onClick={() => setAll(!all)}>
          {all ? "Ver primeras tres" : `Ver todas (${shown.length})`}
        </Button>
      )}
    </>
  );
}
