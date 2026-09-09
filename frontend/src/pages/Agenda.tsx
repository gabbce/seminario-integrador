import { useCalendar } from "../calendar-context";
import { useRooms } from "../room-context";
import { WeekAgenda } from "../components/WeekAgenda";
import { weekDates, closedDay } from "../agenda";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { minutes, dateLabel, type Booking } from "../domain";
import { Button } from "../components/ui/button";

export function Agenda({
  bookings,
  operator,
}: {
  bookings: Booking[];
  operator: boolean;
}) {
  const calendar = useCalendar();
  const rooms = useRooms();
  const [view, setView] = useState<"day" | "week">("day");
  const [date, setDate] = useState("2026-09-14");
  const [room, setRoom] = useState("");
  const [type, setType] = useState("");
  const go = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 720;
  }, [view]);
  const shown = rooms.filter(
    (r) => (!room || r.id === room) && (!type || r.type === type),
  );
  const entries = bookings
    .flatMap((b) =>
      b.occurrences
        .filter(
          (o) =>
            o.date === date &&
            !o.cancelled &&
            shown.some((r) => r.id === o.room),
        )
        .map((o) => ({ b, o })),
    )
    .sort((a, b) => a.o.start.localeCompare(b.o.start));
  function move(n: number) {
    const d = new Date(`${date}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    setDate(d.toISOString().slice(0, 10));
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {view === "day" ? "AGENDA DIARIA" : "AGENDA SEMANAL"}
          </p>
          <h1>
            {view === "day"
              ? dateLabel(date)
              : `Semana del ${dateLabel(weekDates(date)[0])}`}
          </h1>
        </div>
        {operator && (
          <Button onClick={() => go("/reservas/nueva")}>
            <Plus />
            Nueva reserva
          </Button>
        )}
      </div>
      <div
        className="actions agenda-view"
        role="group"
        aria-label="Vista de agenda"
      >
        <Button
          variant={view === "day" ? "default" : "outline"}
          onClick={() => setView("day")}
        >
          Día
        </Button>
        <Button
          variant={view === "week" ? "default" : "outline"}
          onClick={() => setView("week")}
        >
          Semana
        </Button>
      </div>
      <div className="toolbar">
        <div className="date-tools">
          <Button
            variant="outline"
            aria-label={view === "day" ? "Día anterior" : "Semana anterior"}
            onClick={() => move(view === "day" ? -1 : -7)}
          >
            <ChevronLeft />
          </Button>
          <Button variant="outline" onClick={() => setDate("2026-09-08")}>
            Hoy
          </Button>
          <Button
            variant="outline"
            aria-label={view === "day" ? "Día siguiente" : "Semana siguiente"}
            onClick={() => move(view === "day" ? 1 : 7)}
          >
            <ChevronRight />
          </Button>
          <input
            aria-label="Fecha de agenda"
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
          />
        </div>
        <div className="filters">
          <select
            aria-label="Filtrar aula"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
          >
            <option value="">Todas las aulas</option>
            {rooms.map((r) => (
              <option key={r.id}>{r.id}</option>
            ))}
          </select>
          <select
            aria-label="Filtrar tipo"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">Todos los tipos</option>
            {["General", "Multimedios", "Laboratorio"].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>
      {shown.some((r) => r.state && r.state !== "Habilitada") && (
        <p className="closed-notice">
          Aulas no reservables actualmente:{" "}
          {shown
            .filter((r) => r.state && r.state !== "Habilitada")
            .map((r) => `${r.id} (${r.state})`)
            .join(", ")}
          . Se conserva la consulta histórica.
        </p>
      )}
      {view === "week" ? (
        <WeekAgenda
          date={date}
          rooms={shown}
          bookings={bookings}
          openDay={(day) => {
            setDate(day);
            setView("day");
          }}
        />
      ) : (
        <>
          {closedDay(date, calendar) && (
            <p className="closed-notice" role="status">
              {closedDay(date, calendar)}. La ausencia de clases no implica
              disponibilidad.
            </p>
          )}
          <div
            className={`agenda-desktop ${closedDay(date, calendar) ? "closed-day" : ""}`}
            ref={scrollRef}
          >
            <div
              className="agenda-grid"
              style={{
                gridTemplateColumns: `76px repeat(${shown.length}, minmax(190px, 1fr))`,
              }}
            >
              <div className="room-head">Hora</div>
              {shown.map((r) => (
                <div className="room-head" key={r.id}>
                  <strong>
                    {r.id.startsWith("Lab") ? r.id : `Aula ${r.id}`}
                  </strong>
                  <small>
                    {r.capacity} personas · {r.type}
                  </small>
                </div>
              ))}
              <div className="time-column">
                {Array.from({ length: 16 }, (_, i) => (
                  <div key={i}>{String(i + 7).padStart(2, "0")}:00</div>
                ))}
              </div>
              {shown.map((r) => (
                <div
                  className={`room-column ${r.state && r.state !== "Habilitada" ? "unavailable-room" : ""}`}
                  key={r.id}
                >
                  {entries
                    .filter((x) => x.o.room === r.id)
                    .map(({ b, o }) => (
                      <button
                        className={`booking ${r.type}`}
                        key={`${b.id}-${o.date}`}
                        style={{
                          top: (minutes(o.start) - 420) * 2,
                          height: (minutes(o.end) - minutes(o.start)) * 2,
                        }}
                        onClick={() => go(`/reservas/${b.id}`)}
                      >
                        <span>
                          {o.start}–{o.end}
                        </span>
                        <strong>{b.subject}</strong>
                        <span>{b.course}</span>
                        <span>{b.teacher}</span>
                        <span>{b.students} alumnos</span>
                      </button>
                    ))}
                </div>
              ))}
            </div>
          </div>
          <div className="agenda-mobile">
            {entries.length ? (
              entries.map(({ b, o }) => (
                <button
                  className="mobile-booking"
                  key={`${b.id}-${o.date}`}
                  onClick={() => go(`/reservas/${b.id}`)}
                >
                  <span className="eyebrow">
                    {o.start} — {o.end} ·{" "}
                    {o.room.startsWith("Lab") ? o.room : `Aula ${o.room}`}
                  </span>
                  <h2>{b.subject}</h2>
                  <p>
                    {b.course} · {b.teacher}
                  </p>
                  <small>{b.students} alumnos previstos</small>
                  <ChevronRight />
                </button>
              ))
            ) : (
              <div className="panel">No hay reservas para esta fecha.</div>
            )}
          </div>
        </>
      )}
      <div className="agenda-caption">
        <span>{shown.length} aulas mostradas</span>
        <span>Horarios: 07:00–23:00</span>
        {view === "day" && <span>{entries.length} clases este día</span>}
      </div>
    </>
  );
}
