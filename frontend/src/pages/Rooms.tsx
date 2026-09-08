import { DoorOpen } from "lucide-react";
import { rooms } from "../domain";

export function Rooms() {
  return (
    <>
      <div className="page-heading">
        <h1>Aulas</h1>
        <span>{rooms.length} espacios habilitados</span>
      </div>
      <div className="room-cards">
        {rooms.map((r) => (
          <section className="panel" key={r.id}>
            <DoorOpen size={24} />
            <h2>{r.id.startsWith("Lab") ? r.id : `Aula ${r.id}`}</h2>
            <p>{r.type}</p>
            <strong>{r.capacity} personas</strong>
          </section>
        ))}
      </div>
    </>
  );
}
