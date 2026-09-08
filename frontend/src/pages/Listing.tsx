import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { type Booking } from "../domain";

export function Listing({ bookings }: { bookings: Booking[] }) {
  const go = useNavigate();
  return (
    <>
      <div className="page-heading">
        <h1>Reservas</h1>
        <span>{bookings.length} reservas registradas</span>
      </div>
      <div className="panel list">
        {bookings.map((b) => (
          <button key={b.id} onClick={() => go(`/reservas/${b.id}`)}>
            <div>
              <strong>{b.subject}</strong>
              <p>
                {b.course} · {b.teacher}
              </p>
            </div>
            <span>
              {b.occurrences.length} clases <ChevronRight size={18} />
            </span>
          </button>
        ))}
      </div>
    </>
  );
}
