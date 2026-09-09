import { useState, lazy, Suspense } from "react";
import { Clock3, ChartPie, CalendarDays, Users } from "lucide-react";
import type { Booking } from "../domain";
import { useRooms } from "../room-context";
import { useCalendars } from "../calendar-context";
import { dayMetrics } from "../metrics";
const MetricCurve = lazy(() =>
  import("../components/MetricCurve").then((m) => ({ default: m.MetricCurve })),
);
const number = (n: number) =>
  new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(n);
export function Indicators({ bookings }: { bookings: Booking[] }) {
  const rooms = useRooms(),
    calendars = useCalendars();
  const [date, setDate] = useState("2026-09-14"),
    [room, setRoom] = useState(""),
    [type, setType] = useState("");
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date);
  const m = valid
    ? dayMetrics(date, bookings, rooms, calendars, { room, type })
    : null;
  const types = [
    ...new Set(rooms.flatMap((r) => (r.history ?? []).map((h) => h.type))),
  ].sort();
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">INDICADORES · DÍA</p>
          <h1>Uso de aulas y horas pico</h1>
          <p>Programación de clases · De 07:00 a 23:00</p>
        </div>
      </div>
      <section
        className="panel metric-filters"
        aria-label="Filtros de indicadores"
      >
        <label>
          Día
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
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
      {!m ? (
        <p role="alert">Elegí una fecha válida para consultar.</p>
      ) : (
        <>
          {!m.eligible && (
            <p className="closed-notice">
              Sin datos aplicables de apertura para esta fecha.
            </p>
          )}
          {m.unknownCoverage && (
            <p className="closed-notice">
              Cobertura histórica desconocida: no se infiere disponibilidad
              anterior al registro. La ocupación no se calcula.
            </p>
          )}
          <section className="metric-cards" aria-label="Resumen diario">
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
          <Suspense fallback={<p role="status">Cargando gráficos…</p>}>
            <MetricCurve
              slots={m.slots}
              metric="students"
              title="Alumnos previstos"
            />
            <MetricCurve
              slots={m.slots}
              metric="classes"
              title="Clases simultáneas"
            />
          </Suspense>
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
                  {m.slots.map((s) => (
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
        </>
      )}
    </>
  );
}
