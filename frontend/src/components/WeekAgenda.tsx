import { emptyCalendar } from "../calendar";
import { useCalendars } from "../calendar-context";
import { useNavigate } from "react-router-dom";
import { type Booking, type Room, dateLabel } from "../domain";
import { weekDates, closedDay } from "../agenda";
import { Button } from "./ui/button";
export function WeekAgenda({
  date,
  rooms,
  bookings,
  openDay,
}: {
  date: string;
  rooms: Room[];
  bookings: Booking[];
  openDay: (date: string) => void;
}) {
  const calendars = useCalendars();
  const go = useNavigate();
  return (
    <>
      <p className="muted">
        Lunes a viernes · Clases ordenadas por inicio. Desplazá la semana para
        ver todos los días.
      </p>
      <div
        className="week-agenda"
        tabIndex={0}
        role="region"
        aria-label="Agenda semanal"
      >
        {weekDates(date).map((day) => {
          const year = Number(day.slice(0, 4));
          const calendar =
            calendars.find((c) => c.year === year) ?? emptyCalendar(year);
          const entries = bookings
            .flatMap((b) =>
              b.occurrences
                .filter(
                  (o) =>
                    o.date === day &&
                    !o.cancelled &&
                    rooms.some((r) => r.id === o.room),
                )
                .map((o) => ({ b, o })),
            )
            .sort(
              (a, b) =>
                a.o.start.localeCompare(b.o.start) ||
                a.o.room.localeCompare(b.o.room),
            );
          return (
            <section
              className={
                closedDay(day, calendar) ? "week-day closed-day" : "week-day"
              }
              key={day}
            >
              <header>
                <h2>
                  {new Intl.DateTimeFormat("es-AR", {
                    weekday: "long",
                    timeZone: "UTC",
                  }).format(new Date(`${day}T12:00:00Z`))}
                </h2>
                <p>{dateLabel(day)}</p>
                <Button variant="ghost" onClick={() => openDay(day)}>
                  Ver día
                </Button>
              </header>
              {closedDay(day, calendar) && (
                <p className="closed-notice">{closedDay(day, calendar)}</p>
              )}
              {entries.map(({ b, o }) => (
                <button
                  className="week-booking"
                  key={`${b.id}-${o.date}`}
                  onClick={() =>
                    go(`/reservas/${b.id}?fecha=${o.date}&hora=${o.start}`)
                  }
                >
                  <small>
                    {o.start}–{o.end} ·{" "}
                    {o.room.startsWith("Lab") ? o.room : `Aula ${o.room}`}
                  </small>
                  <strong>{b.subject}</strong>
                  <span>{b.course}</span>
                  <span>{b.teacher}</span>
                  <small>{b.students} alumnos previstos</small>
                </button>
              ))}
              {!entries.length && (
                <p className="week-empty">Sin clases registradas</p>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
