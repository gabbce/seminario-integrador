import { rowBooking, useConsultation } from "../consultations";
import { useSearchParams, useLocation } from "react-router-dom";
import { institutionalNow } from "../institutional-time";
import { useCalendar } from "../calendar-context";
import { useRooms } from "../room-context";
import { WeekAgenda } from "../components/WeekAgenda";
import { weekDates, closedDay, roomDaySlots, roomDayTypes } from "../agenda";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { minutes, dateLabel, type Booking } from "../domain";
import { Button } from "../components/ui/button";

export function Agenda({
  bookings: initialBookings,
  persisted = false,
  operator,
  date,
  setDate,
}: {
  persisted?: boolean;
  date: string;
  setDate: (date: string) => void;
  bookings: Booking[];
  operator: boolean;
}) {
  const rooms = useRooms();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const [localView, setLocalView] = useState<"day" | "week">("day");
  const view = persisted
    ? params.get("view") === "week"
      ? "week"
      : "day"
    : localView;
  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => next.set(k, v));
    setParams(next, { replace: true });
  };
  const changeDate = (value: string) =>
    persisted ? update({ fecha: value }) : setDate(value);
  const setView = (value: "day" | "week") =>
    persisted ? update({ view: value }) : setLocalView(value);
  const calendar = useCalendar(Number(date.slice(0, 4)));
  const [localRoom, setLocalRoom] = useState("");
  const [localType, setLocalType] = useState("");
  const room = persisted ? (params.get("room") ?? "") : localRoom;
  const type = persisted ? (params.get("type") ?? "") : localType;
  const setRoom = (value: string) =>
    persisted ? update({ room: value }) : setLocalRoom(value);
  const setType = (value: string) =>
    persisted ? update({ type: value }) : setLocalType(value);
  const query = useConsultation(
    persisted
      ? `/consultas/agenda?${new URLSearchParams({ date, view, room, type })}`
      : null,
  );
  const bookings = persisted
    ? (query.data?.rows.map(rowBooking) ?? [])
    : initialBookings;
  const detailState = persisted
    ? { state: { returnTo: location.pathname + location.search } }
    : undefined;
  const go = useNavigate();
  const shown = rooms.filter(
    (r) =>
      (!room || r.id === room) &&
      (!type ||
        (persisted
          ? bookings.some(
              (b) =>
                b.type === type && b.occurrences.some((o) => o.room === r.id),
            ) || roomDayTypes(r, date).includes(type)
          : r.type === type)),
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
    changeDate(d.toISOString().slice(0, 10));
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
          <Button
            variant="outline"
            onClick={() => changeDate(institutionalNow().slice(0, 10))}
          >
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
            onChange={(e) => e.target.value && changeDate(e.target.value)}
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
            {[
              "General",
              "Multimedios",
              "Laboratorio",
              ...(persisted ? ["Sin historia"] : []),
            ].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>
      <p className="muted">
        Una franja sin clases no garantiza disponibilidad. Consultá
        disponibilidad para reservar.
      </p>
      {persisted && view === "day" && (
        <p className="muted">
          Estado histórico por franja: las zonas rayadas indican
          indisponibilidad o cobertura desconocida.{" "}
          {shown
            .filter((r) =>
              roomDaySlots(r, date).some((slot) => slot.state !== "Habilitada"),
            )
            .map((r) => r.id)
            .join(", ") ||
            "Todas las aulas mostradas tienen cobertura habilitada completa."}
        </p>
      )}
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
      {persisted && query.error ? (
        <section className="panel" role="alert">
          {query.error}{" "}
          <Button onClick={query.retry}>Reintentar consulta</Button>
        </section>
      ) : persisted && !query.data ? (
        <p role="status">Cargando agenda…</p>
      ) : view === "week" ? (
        <WeekAgenda
          date={date}
          rooms={shown}
          bookings={bookings}
          openDay={(day) => {
            if (persisted) update({ fecha: day, view: "day" });
            else {
              setDate(day);
              setView("day");
            }
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
          <p className="agenda-scroll-hint">
            Cada fila es un aula y las horas van de 07:00 a 23:00. Elegí una
            clase para ver su detalle.
          </p>
          <div
            role="region"
            aria-label="Agenda diaria por aulas"
            tabIndex={0}
            className={`agenda-desktop agenda-timeline ${closedDay(date, calendar) ? "closed-day" : ""}`}
          >
            <div className="timeline-row timeline-header" aria-hidden="true">
              <div className="room-head">Aula</div>
              <div className="timeline-hours">
                {Array.from({ length: 16 }, (_, i) => (
                  <span key={i} style={{ left: `${(i / 16) * 100}%` }}>
                    {String(i + 7).padStart(2, "0")}:00
                  </span>
                ))}
              </div>
            </div>
            {shown.map((r) => (
              <div className="timeline-row" key={r.id}>
                <div className="room-head">
                  <strong>
                    {r.id.startsWith("Lab") ? r.id : `Aula ${r.id}`}
                  </strong>
                  <small>
                    {r.capacity} personas ·{" "}
                    {persisted ? roomDayTypes(r, date).join(" / ") : r.type}
                  </small>
                </div>
                <div
                  className={`timeline-track ${!persisted && r.state && r.state !== "Habilitada" ? "unavailable-room" : ""}`}
                >
                  {persisted &&
                    roomDaySlots(r, date).map(
                      ({ index: i, start, end, state }) => {
                        return state === "Habilitada" ? null : (
                          <div
                            key={i}
                            className="agenda-unavailable-slot"
                            style={{
                              left: `${(i / 32) * 100}%`,
                              width: `${100 / 32}%`,
                            }}
                            title={`${start}–${end} · ${state}`}
                          >
                            <span>{state}</span>
                          </div>
                        );
                      },
                    )}
                  {entries
                    .filter((x) => x.o.room === r.id)
                    .map(({ b, o }) => {
                      const summary = `${o.start}–${o.end} · ${b.subject} · ${b.course} · ${b.teacher} · ${b.students} alumnos`;
                      return (
                        <button
                          className={`booking ${persisted ? b.type : r.type}`}
                          key={o.id ?? `${b.id}-${o.date}-${o.start}`}
                          style={{
                            left: `${((minutes(o.start) - 420) / 960) * 100}%`,
                            width: `${((minutes(o.end) - minutes(o.start)) / 960) * 100}%`,
                          }}
                          title={summary}
                          aria-label={summary}
                          onClick={() =>
                            go(
                              `/reservas/${b.id}?fecha=${o.date}&hora=${o.start}`,
                              detailState,
                            )
                          }
                        >
                          <span>{o.start}</span>
                          <strong>{b.subject}</strong>
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
          <div className="agenda-mobile">
            {entries.length ? (
              entries.map(({ b, o }) => (
                <button
                  className="mobile-booking"
                  key={o.id ?? `${b.id}-${o.date}-${o.start}`}
                  onClick={() =>
                    go(
                      `/reservas/${b.id}?fecha=${o.date}&hora=${o.start}`,
                      detailState,
                    )
                  }
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
