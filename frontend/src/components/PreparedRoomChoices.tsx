import { useState } from "react";
import type { PreparedPattern } from "../periodic-preparation";
import { Button } from "./ui/button";

export function PreparedRoomChoices({
  pattern,
  selected,
  onSelect,
  readOnly,
}: {
  pattern: PreparedPattern;
  selected: string;
  onSelect: (room: string) => void;
  readOnly: boolean;
}) {
  const [all, setAll] = useState(false);
  const rooms = pattern.availableRooms;
  return (
    <>
      {!pattern.dates.length ? (
        <p className="error">
          Este día no tiene clases efectivas. Ajustá el período, los días o las
          exclusiones.
        </p>
      ) : (
        !rooms.length && (
          <p className="error">
            {pattern.compatibleCount
              ? "No hay un aula libre durante todo el período para este día y horario."
              : "No hay aulas compatibles con la capacidad, el tipo y los recursos solicitados."}
          </p>
        )
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
