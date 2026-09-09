import { useDemoQuery } from "../demo-query";
import { useState, lazy, Suspense } from "react";
import { Clock3, ChartPie, CalendarDays, Users } from "lucide-react";
import type { Booking } from "../domain";
import { useRooms } from "../room-context";
import { useCalendars } from "../calendar-context";
import { MetricWeek } from "../components/MetricWeek";
import { Button } from "../components/ui/button";
import { dayMetrics, rangeMetrics, validMetricDate } from "../metrics";
const MetricCurve = lazy(() =>
  import("../components/MetricCurve").then((m) => ({ default: m.MetricCurve })),
);
const number = (n: number) =>
  new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(n);
export function Indicators({ bookings }: { bookings: Booking[] }) {
  const rooms = useRooms(),
    calendars = useCalendars();
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [date, setDate] = useState("2026-09-14"),
    [room, setRoom] = useState(""),
    [type, setType] = useState("");
  const [mode, setMode] = useState<"day" | "week">("day");
  const [period, setPeriod] = useState("2026:second");
  const [customFrom, setCustomFrom] = useState("2026-09-14"),
    [customTo, setCustomTo] = useState("2026-12-18");
  const [year, term] = period.split(":");
  const calendar = calendars.find((c) => c.year === Number(year));
  const bounds =
    term === "first" ? calendar?.terms.first : calendar?.terms.second;
  const from = period === "custom" ? customFrom : (bounds?.[0] ?? ""),
    to = period === "custom" ? customTo : (bounds?.[1] ?? "");
  const daily =
    mode === "day" && validMetricDate(date)
      ? dayMetrics(date, bookings, rooms, calendars, { room, type })
      : null;
  const weekly =
    mode === "week"
      ? rangeMetrics(from, to, bookings, rooms, calendars, { room, type })
      : null;
  const m = daily ?? weekly;
  const response = useDemoQuery(
    JSON.stringify([
      mode,
      date,
      from,
      to,
      room,
      type,
      bookings,
      rooms,
      calendars,
    ]),
  );
  const types = [
    ...new Set(rooms.flatMap((r) => (r.history ?? []).map((h) => h.type))),
  ].sort();
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            INDICADORES · {mode === "day" ? "DÍA" : "SEMANA TÍPICA"}
          </p>
          <h1>Uso de aulas y horas pico</h1>
          <p>Programación de clases · De 07:00 a 23:00</p>
        </div>
      </div>
      <div className="metric-toggle" aria-label="Vista de indicadores">
        <Button
          variant={mode === "day" ? "default" : "outline"}
          onClick={() => setMode("day")}
        >
          Día
        </Button>
        <Button
          variant={mode === "week" ? "default" : "outline"}
          onClick={() => setMode("week")}
        >
          Semana típica
        </Button>
      </div>
      <section
        className="panel metric-filters"
        aria-label="Filtros de indicadores"
      >
        {mode === "day" ? (
          <label>
            Día
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
        ) : (
          <label>
            Período
            <select
              aria-label="Período"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              {calendars.flatMap((c) =>
                (["first", "second"] as const).map((term, i) => (
                  <option key={`${c.year}:${term}`} value={`${c.year}:${term}`}>
                    {i + 1}.º cuatrimestre · {c.year}
                  </option>
                )),
              )}
              <option value="custom">Rango personalizado</option>
            </select>
          </label>
        )}
        {mode === "week" && period === "custom" && (
          <>
            <label>
              Desde
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
            </label>
            <label>
              Hasta
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </label>
          </>
        )}
        <label>
          Aula
          <select
            aria-label="Aula"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
          >
            <option value="">Todas las aulas</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tipo de aula
          <select
            aria-label="Tipo de aula"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">Todos los tipos</option>
            {types.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
      </section>
      {response.status === "loading" ? (
        <section className="panel" role="status">
          <h2>Consultando indicadores…</h2>
          <p>Estamos preparando los resultados del filtro actual.</p>
        </section>
      ) : response.status === "error" ? (
        <section className="panel" role="alert">
          <h2>No pudimos consultar los indicadores</h2>
          <p>Los filtros se conservan. Intentá nuevamente.</p>
          <Button onClick={response.retry}>Reintentar consulta</Button>
        </section>
      ) : !m ? (
        <p role="alert">
          Elegí una fecha o rango válido para consultar (inicio anterior o igual
          al fin).
        </p>
      ) : (
        <>
          {!m.eligible && (
            <p className="closed-notice">
              Sin datos aplicables de apertura para la consulta.
            </p>
          )}
          {m.unknownCoverage && (
            <p className="closed-notice">
              Cobertura histórica desconocida: no se infiere disponibilidad
              anterior al registro. La ocupación no se calcula.
            </p>
          )}
          <section
            className="metric-cards"
            aria-label={mode === "day" ? "Resumen diario" : "Resumen del rango"}
          >
            <article className="panel metric-card">
              <Clock3 />
              <div>
                <span>Horas reservadas</span>
                <strong>{number(m.hours)} h</strong>
                <small>Horas-aula</small>
              </div>
            </article>
            <article className="panel metric-card">
              <ChartPie />
              <div>
                <span>Ocupación</span>
                <strong>
                  {m.occupancy === null ? "—" : `${number(m.occupancy)} %`}
                </strong>
                <small>
                  {m.unknownCoverage
                    ? "Cobertura desconocida"
                    : !m.availableHours
                      ? "Sin horas habilitadas"
                      : `${number(m.hours)} / ${number(m.availableHours)} h habilitadas`}
                </small>
              </div>
            </article>
            <article className="panel metric-card">
              <CalendarDays />
              <div>
                <span>Clases programadas</span>
                <strong>{m.classes}</strong>
                <small>Ocurrencias sin cancelar</small>
              </div>
            </article>
          </section>
          {weekly && (
            <>
              <p className="metric-range">
                Rango consultado: {from} — {to}
              </p>
              <MetricWeek key={`${from}:${to}:${room}:${type}`} data={weekly} />
            </>
          )}
          {daily && (
            <Suspense fallback={<p role="status">Cargando gráficos…</p>}>
              <MetricCurve
                slots={daily.slots}
                onSelect={setSelectedSlot}
                metric="students"
                title="Alumnos previstos"
              />
              <MetricCurve
                slots={daily.slots}
                onSelect={setSelectedSlot}
                metric="classes"
                title="Clases simultáneas"
              />
            </Suspense>
          )}
          {daily && (
            <section className="panel daily-slot">
              <label>
                Franja del día
                <select
                  aria-label="Franja del día"
                  value={selectedSlot ?? ""}
                  onChange={(e) =>
                    setSelectedSlot(
                      e.target.value === "" ? null : Number(e.target.value),
                    )
                  }
                >
                  <option value="">Elegí una franja</option>
                  {daily.slots.map((s, i) => (
                    <option key={s.start} value={i}>
                      {s.start}–{s.end}
                    </option>
                  ))}
                </select>
              </label>
              <p>
                Elegí en el gráfico con clic o toque, o usá este selector con
                teclado.
              </p>
              {selectedSlot !== null && (
                <p role="status">
                  {daily.slots[selectedSlot].start}–
                  {daily.slots[selectedSlot].end} ·{" "}
                  {daily.slots[selectedSlot].students} alumnos previstos ·{" "}
                  {daily.slots[selectedSlot].classes} clases simultáneas · 1
                  fecha aportante.
                </p>
              )}
            </section>
          )}
          <div className="panel metric-volume">
            <Users />
            <strong>{number(m.studentHours)}</strong>
            <span>alumnos-hora</span>
          </div>
          <p className="metric-note">
            Estimación con 100 % de asistencia. No representa personas únicas ni
            asistencia observada. Las clases pueden compartir alumnos. Para
            fechas futuras se proyecta la disponibilidad conocida de las aulas.
          </p>
          <section className="panel">
            <h2>Demanda atendida por tipo de aula</h2>
            <div className="metric-table">
              <table>
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Clases</th>
                    <th>Horas-aula</th>
                  </tr>
                </thead>
                <tbody>
                  {m.demand.map((d) => (
                    <tr key={d.type}>
                      <td>{d.type}</td>
                      <td>{d.classes}</td>
                      <td>{number(d.hours)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!m.demand.length && (
              <p>Sin clases programadas para los filtros elegidos.</p>
            )}
          </section>
          {daily && (
            <details className="panel metric-values">
              <summary>Ver las 32 franjas y sus valores</summary>
              <p>Un día aporta cada valor. Inicio incluido, fin excluido.</p>
              <div className="metric-table">
                <table>
                  <thead>
                    <tr>
                      <th>Franja</th>
                      <th>Alumnos previstos</th>
                      <th>Clases simultáneas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {daily.slots.map((s) => (
                      <tr key={s.start}>
                        <th scope="row">
                          {s.start}–{s.end}
                        </th>
                        <td>{s.students}</td>
                        <td>{s.classes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </>
      )}
    </>
  );
}
