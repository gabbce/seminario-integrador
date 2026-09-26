import { useSearchParams } from "react-router-dom";
import { Clock3, ChartPie, CalendarDays } from "lucide-react";
import { useRooms } from "../room-context";
import { useCalendars } from "../calendar-context";
import { useApiQuery } from "../use-api-query";
import { institutionalNow } from "../institutional-time";
import type { IndicatorSummary } from "../indicator-api";
import { Button } from "../components/ui/button";
const number = (n: number) =>
  new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(n);
export function PersistedIndicators() {
  const rooms = useRooms(),
    calendars = useCalendars();
  const [params, setParams] = useSearchParams();
  const today = institutionalNow().slice(0, 10);
  const mode = params.get("mode") === "week" ? "week" : "day";
  const date = params.get("date") || today,
    room = params.get("room") || "",
    type = params.get("type") || "";
  const period = params.get("period") || "custom";
  const [year, term] = period.split(":");
  const calendar = calendars.find((c) => c.year === Number(year));
  const bounds =
    term === "first" ? calendar?.terms.first : calendar?.terms.second;
  const from =
    mode === "day"
      ? date
      : period === "custom"
        ? params.get("from") || today
        : bounds?.[0] || "";
  const to =
    mode === "day"
      ? date
      : period === "custom"
        ? params.get("to") || today
        : bounds?.[1] || "";
  function change(patch: Record<string, string>) {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => next.set(k, v));
    setParams(next, { replace: true });
  }
  const valid = !!from && !!to && from <= to;
  const query = useApiQuery<IndicatorSummary>(
    valid
      ? `/indicadores/resumen?${new URLSearchParams({ from, to, room, type })}`
      : null,
  );
  const m = query.data;
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            INDICADORES · {mode === "day" ? "DÍA" : "RANGO"}
          </p>
          <h1>Uso de aulas y horas pico</h1>
          <p>Programación de clases · De 07:00 a 23:00</p>
        </div>
      </div>
      <div className="metric-toggle" aria-label="Vista de indicadores">
        <Button
          variant={mode === "day" ? "default" : "outline"}
          onClick={() => change({ mode: "day" })}
        >
          Día
        </Button>
        <Button
          variant={mode === "week" ? "default" : "outline"}
          onClick={() => change({ mode: "week" })}
        >
          Cuatrimestre / rango
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
              onChange={(e) => change({ date: e.target.value })}
            />
          </label>
        ) : (
          <label>
            Período
            <select
              aria-label="Período"
              value={period}
              onChange={(e) => change({ period: e.target.value })}
            >
              {calendars.flatMap((c) =>
                (["first", "second"] as const)
                  .filter((t) => c.terms[t][0] && c.terms[t][1])
                  .map((t) => (
                    <option key={`${c.year}:${t}`} value={`${c.year}:${t}`}>
                      {t === "first" ? 1 : 2}.º cuatrimestre · {c.year}
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
                value={from}
                onChange={(e) => change({ from: e.target.value })}
              />
            </label>
            <label>
              Hasta
              <input
                type="date"
                value={to}
                onChange={(e) => change({ to: e.target.value })}
              />
            </label>
          </>
        )}
        <label>
          Aula
          <select
            aria-label="Aula"
            value={room}
            onChange={(e) => change({ room: e.target.value })}
          >
            <option value="">Todas las aulas</option>
            {rooms.map((r) => (
              <option key={r.id}>{r.id}</option>
            ))}
          </select>
        </label>
        <label>
          Tipo de aula
          <select
            aria-label="Tipo de aula"
            value={type}
            onChange={(e) => change({ type: e.target.value })}
          >
            <option value="">Todos los tipos</option>
            {["General", "Multimedios", "Laboratorio", "Sin historia"].map(
              (t) => (
                <option key={t}>{t}</option>
              ),
            )}
          </select>
        </label>
      </section>
      {!valid ? (
        <p role="alert">
          Elegí una fecha o rango válido (inicio anterior o igual al fin).
        </p>
      ) : query.error ? (
        <section className="panel" role="alert">
          <h2>No pudimos consultar los indicadores</h2>
          <p>{query.error}</p>
          <Button onClick={query.retry}>Reintentar consulta</Button>
        </section>
      ) : !m ? (
        <p role="status">Consultando indicadores…</p>
      ) : (
        <>
          <p className="metric-range">
            Rango consultado: {m.from} — {m.to}
          </p>
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
          {m.forecast && (
            <p className="muted">
              Previsión: las fechas futuras proyectan el último estado conocido
              de cada aula.
            </p>
          )}
          <section className="metric-cards" aria-label="Resumen de indicadores">
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
          <section className="panel">
            <h2>Demanda atendida por tipo de aula</h2>
            <div className="metric-table">
              <table>
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Clases</th>
                    <th>Horas-aula reservadas</th>
                    <th>Horas-aula habilitadas</th>
                  </tr>
                </thead>
                <tbody>
                  {m.demand.map((d) => (
                    <tr key={d.label}>
                      <td>{d.label}</td>
                      <td>{d.classes}</td>
                      <td>{number(d.hours)}</td>
                      <td>{number(d.availableHours)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!m.classes && (
              <p>Sin clases programadas para los filtros elegidos.</p>
            )}
          </section>
          <details className="panel metric-values">
            <summary>Ver desglose por aula</summary>
            <div className="metric-table">
              <table>
                <thead>
                  <tr>
                    <th>Aula</th>
                    <th>Clases</th>
                    <th>Horas reservadas</th>
                    <th>Horas habilitadas</th>
                  </tr>
                </thead>
                <tbody>
                  {m.rooms.map((r) => (
                    <tr key={r.label}>
                      <td>{r.label}</td>
                      <td>{r.classes}</td>
                      <td>{number(r.hours)}</td>
                      <td>{number(r.availableHours)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
          <p className="metric-note">
            Programación prevista, no asistencia observada. Las horas de aulas
            distintas se suman, aunque sean simultáneas.
          </p>
        </>
      )}
    </>
  );
}
