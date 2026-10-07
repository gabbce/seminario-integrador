import { rowBooking, useConsultation } from "../consultations";
import { useSearchParams, useLocation } from "react-router-dom";
import { institutionalNow } from "../institutional-time";
import { isDate } from "../date-input";
import { useCalendar } from "../calendar-context";
import { useRooms } from "../room-context";
import { WeekAgenda } from "../components/WeekAgenda";
import { weekDates, closedDay, roomDaySlots, roomDayTypes } from "../agenda";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { minutes, dateLabel, type Booking } from "../domain";
import { Button } from "../components/ui/button";
import { courseLabel, type Course } from "../catalog";
import { useTeachers } from "../teacher-context";

// Day grid geometry: the hour column plus one minimum-width column per room.
const HOUR_COLUMN = 76;
const ROOM_COLUMN = 190;
// One pixel per minute: a 30-minute module is 30 px tall (App.css .room-column and .time-column match).
const PX_PER_MINUTE = 1;
const DAY_START = 7 * 60;

export function Agenda({
  bookings: initialBookings,
  persisted = false,
  operator,
  date,
  setDate,
  courses = [],
}: {
  persisted?: boolean;
  date: string;
  setDate: (date: string) => void;
  bookings: Booking[];
  operator: boolean;
  courses?: Course[];
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
    // Any other change shows a new set of rooms: start again at the first page of rooms.
    if (!("aulas" in patch)) next.delete("aulas");
    setParams(next, { replace: true });
  };
  const changeDate = (value: string) => {
    if (!isDate(value)) return;
    if (persisted) update({ fecha: value });
    else setDate(value);
  };
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
  const teachers = useTeachers();
  const [localCourse, setLocalCourse] = useState("");
  const [localTeacher, setLocalTeacher] = useState("");
  const course = persisted ? (params.get("course") ?? "") : localCourse;
  const teacher = persisted ? (params.get("teacher") ?? "") : localTeacher;
  const setCourse = (value: string) =>
    persisted ? update({ course: value }) : setLocalCourse(value);
  const setTeacher = (value: string) =>
    persisted ? update({ teacher: value }) : setLocalTeacher(value);
  const narrowed = Boolean(course || teacher);
  const narrowedTo = [
    course &&
      (() => {
        const c = courses.find((x) => x.id === course);
        return c ? `${c.subject} ${courseLabel(c)}` : "el curso elegido";
      })(),
    teacher &&
      (teachers.find((t) => t.id === teacher)?.name ?? "el docente elegido"),
  ]
    .filter(Boolean)
    .join(" con ");
  const agendaFilters = new URLSearchParams({ date, view, room, type });
  if (course) agendaFilters.set("courseId", course);
  if (teacher) agendaFilters.set("teacher", teacher);
  const query = useConsultation(
    persisted ? `/consultas/agenda?${agendaFilters}` : null,
  );
  const bookings = persisted
    ? (query.data?.rows.map(rowBooking) ?? [])
    : initialBookings.filter(
        (b) =>
          (!course || b.courseId === course) &&
          (!teacher || b.teacherId === teacher),
      );
  const unknownRooms = [
    ...new Set(
      query.data?.rows
        .filter((row) => !rooms.some((room) => room.id === row.room))
        .map((row) => row.room) ?? [],
    ),
  ]
    .sort()
    .join(", ");
  const refreshedRooms = useRef("");
  useEffect(() => {
    if (unknownRooms && refreshedRooms.current !== unknownRooms) {
      refreshedRooms.current = unknownRooms;
      window.dispatchEvent(new Event("aulas-inventory-refresh"));
    }
  }, [unknownRooms]);
  const detailState = persisted
    ? { state: { returnTo: location.pathname + location.search } }
    : undefined;
  const go = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Open at 13:00, the middle of the institutional day.
    if (scrollRef.current)
      scrollRef.current.scrollTop = (13 * 60 - DAY_START) * PX_PER_MINUTE;
  }, [view]);
  // The day grid shows as many rooms as fit its width and pages the rest, so it never scrolls sideways.
  const [gridWidth, setGridWidth] = useState(0);
  const resize = useRef<ResizeObserver | null>(null);
  const gridRef = useCallback((element: HTMLDivElement | null) => {
    resize.current?.disconnect();
    scrollRef.current = element;
    if (!element || typeof ResizeObserver === "undefined") return;
    resize.current = new ResizeObserver(() =>
      setGridWidth(element.clientWidth),
    );
    resize.current.observe(element);
  }, []);
  const shown = rooms.filter(
    (r) =>
      (!room || r.id === room) &&
      // A course or teacher filter keeps only the rooms where those classes are.
      (!narrowed ||
        bookings.some((b) =>
          b.occurrences.some((o) => o.room === r.id && !o.cancelled),
        )) &&
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
  const perPage =
    gridWidth > 0
      ? Math.max(1, Math.floor((gridWidth - HOUR_COLUMN) / ROOM_COLUMN))
      : Math.max(1, shown.length);
  const roomPages = Math.max(1, Math.ceil(shown.length / perPage));
  const filterKey = [date, view, room, type, course, teacher].join("|");
  const [localRoomPage, setLocalRoomPage] = useState({ key: "", page: 0 });
  const requestedPage = persisted
    ? Math.max(0, Number(params.get("aulas") ?? "1") - 1 || 0)
    : localRoomPage.key === filterKey
      ? localRoomPage.page
      : 0;
  const roomPage = Math.min(requestedPage, roomPages - 1);
  const setRoomPage = (page: number) =>
    persisted
      ? update({ aulas: String(page + 1) })
      : setLocalRoomPage({ key: filterKey, page });
  const pageRooms = shown.slice(roomPage * perPage, (roomPage + 1) * perPage);
  const pageEntries = entries.filter((x) =>
    pageRooms.some((r) => r.id === x.o.room),
  );
  function move(n: number) {
    const d = new Date(`${date}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    changeDate(d.toISOString().slice(0, 10));
  }
  return (
    <>
      {unknownRooms && (
        <p role="alert">
          Hay clases en aulas pendientes de actualizar: {unknownRooms}.{" "}
          <Button
            onClick={() => {
              window.dispatchEvent(new Event("aulas-inventory-refresh"));
              query.retry();
            }}
          >
            Actualizar aulas y agenda
          </Button>
        </p>
      )}
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
          {courses.length > 0 && (
            <select
              aria-label="Filtrar curso"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
            >
              <option value="">Todos los cursos</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.subject} · {courseLabel(c)}
                </option>
              ))}
            </select>
          )}
          {teachers.length > 0 && (
            <select
              aria-label="Filtrar docente"
              value={teacher}
              onChange={(e) => setTeacher(e.target.value)}
            >
              <option value="">Todos los docentes</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
      <p className="muted">
        Una franja sin clases no garantiza disponibilidad. Consultá
        disponibilidad para reservar.
      </p>
      {narrowed && (
        <p className="closed-notice" role="status">
          Mostrando solo las clases de {narrowedTo}. Los espacios vacíos no
          indican aulas libres.
        </p>
      )}
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
            Desplazá la agenda verticalmente para recorrer los horarios.
            {roomPages > 1 &&
              " Las aulas que no entran a lo ancho siguen en «Aulas siguientes»."}
          </p>
          {roomPages > 1 && (
            <nav className="agenda-room-pager" aria-label="Páginas de aulas">
              <Button
                variant="outline"
                disabled={roomPage === 0}
                onClick={() => setRoomPage(roomPage - 1)}
              >
                <ChevronLeft />
                Aulas anteriores
              </Button>
              <span role="status">
                Aulas {roomPage * perPage + 1}–
                {roomPage * perPage + pageRooms.length} de {shown.length}
                {entries.length > pageEntries.length &&
                  ` · ${entries.length - pageEntries.length} clases en otras páginas`}
              </span>
              <Button
                variant="outline"
                disabled={roomPage >= roomPages - 1}
                onClick={() => setRoomPage(roomPage + 1)}
              >
                Aulas siguientes
                <ChevronRight />
              </Button>
            </nav>
          )}
          <div
            role="region"
            aria-label="Agenda diaria por aulas"
            tabIndex={0}
            className={`agenda-desktop ${closedDay(date, calendar) ? "closed-day" : ""}`}
            ref={gridRef}
          >
            {narrowed && !shown.length ? (
              <div className="panel">
                No hay clases para estos filtros en esta fecha.
              </div>
            ) : (
              <div
                className="agenda-grid"
                style={{
                  gridTemplateColumns: `${HOUR_COLUMN}px repeat(${pageRooms.length}, minmax(${ROOM_COLUMN}px, 1fr))`,
                }}
              >
                <div className="room-head">Hora</div>
                {pageRooms.map((r) => (
                  <div className="room-head" key={r.id}>
                    <strong>
                      {r.id.startsWith("Lab") ? r.id : `Aula ${r.id}`}
                    </strong>
                    <small>
                      {r.capacity} personas ·{" "}
                      {persisted ? roomDayTypes(r, date).join(" / ") : r.type}
                    </small>
                  </div>
                ))}
                <div className="time-column">
                  {Array.from({ length: 16 }, (_, i) => (
                    <div key={i}>{String(i + 7).padStart(2, "0")}:00</div>
                  ))}
                </div>
                {pageRooms.map((r) => (
                  <div
                    className={`room-column ${!persisted && r.state && r.state !== "Habilitada" ? "unavailable-room" : ""}`}
                    key={r.id}
                  >
                    {persisted &&
                      roomDaySlots(r, date).map(
                        ({ index: i, start, end, state }) => {
                          return state === "Habilitada" ? null : (
                            <div
                              key={i}
                              className="agenda-unavailable-slot"
                              style={{
                                top: i * 30 * PX_PER_MINUTE,
                                height: 30 * PX_PER_MINUTE,
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
                        const length = minutes(o.end) - minutes(o.start);
                        // Shorter blocks pack the same data into fewer lines; the tooltip repeats it whole.
                        const size =
                          length <= 30
                            ? "short"
                            : length <= 60
                              ? "medium"
                              : "long";
                        return (
                          <button
                            className={`booking booking-${size} ${persisted ? b.type : r.type}`}
                            key={o.id ?? `${b.id}-${o.date}-${o.start}`}
                            style={{
                              top:
                                (minutes(o.start) - DAY_START) * PX_PER_MINUTE,
                              height: length * PX_PER_MINUTE,
                            }}
                            title={`${o.start}–${o.end} · ${b.subject} · ${b.course} · ${b.teacher} · ${b.students} alumnos`}
                            onClick={() =>
                              go(
                                `/reservas/${b.id}?fecha=${o.date}&hora=${o.start}`,
                                detailState,
                              )
                            }
                          >
                            {size === "short" ? (
                              <span>
                                <strong>{b.subject}</strong> {b.course} ·{" "}
                                {o.start}–{o.end} · {b.teacher} · {b.students}{" "}
                                alumnos
                              </span>
                            ) : size === "medium" ? (
                              <>
                                <strong>{b.subject}</strong>
                                <span>
                                  {o.start}–{o.end} · {b.students} alumnos
                                </span>
                                <span>
                                  {b.course} · {b.teacher}
                                </span>
                              </>
                            ) : (
                              <>
                                <strong>{b.subject}</strong>
                                <span>
                                  {o.start}–{o.end}
                                </span>
                                <span>{b.course}</span>
                                <span>
                                  {b.teacher} · {b.students} alumnos
                                </span>
                              </>
                            )}
                          </button>
                        );
                      })}
                  </div>
                ))}
              </div>
            )}
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
