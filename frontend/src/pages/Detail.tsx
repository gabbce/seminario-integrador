import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { type Booking, dateLabel } from "../domain";
import { Pending } from "./Pending";
import { Button } from "../components/ui/button";

export function Detail({ bookings }: { bookings: Booking[] }) {
  const { id } = useParams();
  const go = useNavigate();
  const b = bookings.find((b) => b.id === id);
  if (!b) return <Pending name="Reserva no encontrada" />;
  return (
    <>
      <Button variant="ghost" onClick={() => go("/reservas")}>
        <ChevronLeft />
        Reservas
      </Button>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{b.id} · CONFIRMADA</p>
          <h1>{b.subject}</h1>
          <p>
            {b.course} · {b.teacher} · {b.students} alumnos previstos
          </p>
        </div>
      </div>
      <section className="panel">
        <h2>{b.occurrences.length} clases registradas</h2>
        <div className="detail-dates">
          {b.occurrences.map((o) => (
            <div key={o.date}>
              <span>{dateLabel(o.date)}</span>
              <span>
                {o.start}–{o.end}
              </span>
              <strong>Aula {o.room}</strong>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
