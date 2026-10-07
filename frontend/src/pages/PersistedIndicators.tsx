import { useState, lazy, Suspense } from "react";
import { MetricWeek } from "../components/MetricWeek";
import { useSearchParams } from "react-router-dom";
import { Clock3, ChartPie, CalendarDays } from "lucide-react";
import { useRooms } from "../room-context";
import { useCalendars } from "../calendar-context";
import { useApiQuery } from "../use-api-query";
import { institutionalNow } from "../institutional-time";
import { isDate } from "../date-input";
import type { IndicatorSeries } from "../indicator-api";
import { Button } from "../components/ui/button";
import { MetricComparison } from "../components/MetricComparison";
import { resourceLabels, type Resource } from "../equipment";
const MetricCurve = lazy(() =>
  import("../components/MetricCurve").then((m) => ({ default: m.MetricCurve })),
);
const number = (n: number) =>
  new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(n);
export function PersistedIndicators() {
  const [selectedSlot, setSelectedSlot] = useState(0);
  const rooms = useRooms(),
    calendars = useCalendars();
  const [params, setParams] = useSearchParams();
  const today = institutionalNow().slice(0, 10);
  const mode =
    params.get("mode") === "week"
      ? "week"
      : params.get("mode") === "compare"
        ? "compare"
        : "day";
  const date = params.get("date") ?? today,
    room = params.get("room") || "",
    type = params.get("type") || "";
  // A term uses its calendar bounds; a custom range uses its own dates.
  function range(periodKey: string, fromKey: string, toKey: string) {
    const period = params.get(periodKey) || "custom";
    const [year, term] = period.split(":");
    const calendar = calendars.find((c) => c.year === Number(year));
    const bounds =
      term === "first" ? calendar?.terms.first : calendar?.terms.second;
    const label =
      period === "custom"
        ? "Rango personalizado"
        : `${term === "first" ? 1 : 2}.º cuatrimestre ${year}`;
    return period === "custom"
      ? {
          period,
          label,
          from: params.get(fromKey) ?? today,
          to: params.get(toKey) ?? today,
        }
      : { period, label, from: bounds?.[0] || "", to: bounds?.[1] || "" };
  }
  const first =
    mode === "day"
      ? { period: "custom", label: date, from: date, to: date }
      : range("period", "from", "to");
  const second = range("periodB", "fromB", "toB");
  const { from, to } = first;
  // Room attributes narrow the set of rooms for reserved and available hours alike (DA-87).
  const location = params.get("location") || "",
    floor = params.get("floor") || "",
    minCapacity = params.get("minCapacity") || "",
    maxCapacity = params.get("maxCapacity") || "";
  const resources = (params.get("resources") || "")
    .split(",")
    .filter((r): r is Resource => r in resourceLabels);
  const roomFilters: Record<string, string> = { room, type };
  if (location) roomFilters.location = location;
  if (floor) roomFilters.floor = floor;
  if (minCapacity) roomFilters.minCapacity = minCapacity;
  if (maxCapacity) roomFilters.maxCapacity = maxCapacity;
  if (resources.length) roomFilters.resources = resources.join(",");
  const locations = [
    ...new Set(rooms.map((r) => r.location).filter((l): l is string => !!l)),
  ].sort();
  const floors = [
    ...new Set(
      rooms.map((r) => r.floor).filter((f): f is number => f !== undefined),
    ),
  ].sort((a, b) => a - b);
  // Build on the URL the browser already holds, not on this render's copy, so two quick edits
  // (before the router re-renders) do not overwrite each other.
  function change(patch: Record<string, string>) {
    const next = new URLSearchParams(window.location.search);
    Object.entries(patch).forEach(([k, v]) => next.set(k, v));
    setParams(next, { replace: true });
  }
  function periodControls(
    label: string,
    suffix: string,
    keys: { period: string; from: string; to: string },
    value: { period: string; from: string; to: string },
  ) {
    return (
      <>
        <label>
          {label}
          <select
            aria-label={label}
            value={value.period}
            onChange={(e) => change({ [keys.period]: e.target.value })}
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
        {value.period === "custom" && (
          <>
            <label>
              Desde{suffix}
              <input
                type="date"
                value={value.from}
                onChange={(e) => change({ [keys.from]: e.target.value })}
              />
            </label>
            <label>
              Hasta{suffix}
              <input
                type="date"
                value={value.to}
                onChange={(e) => change({ [keys.to]: e.target.value })}
              />
            </label>
          </>
        )}
      </>
    );
  }
  const capacityValid =
    !minCapacity || !maxCapacity || Number(maxCapacity) >= Number(minCapacity);
  const valid =
    isDate(from) &&
    isDate(to) &&
    from <= to &&
    (mode !== "compare" ||
      (isDate(second.from) && isDate(second.to) && second.from <= second.to));
  const roomValid = !room || rooms.some((candidate) => candidate.id === room);
  const ready = valid && capacityValid && roomValid;
  const query = useApiQuery<IndicatorSeries>(
    ready
      ? `/indicadores/serie?${new URLSearchParams({ from, to, ...roomFilters, view: mode === "day" ? "day" : "week" })}`
      : null,
  );
  const compared = useApiQuery<IndicatorSeries>(
    ready && mode === "compare"
      ? `/indicadores/serie?${new URLSearchParams({ from: second.from, to: second.to, ...roomFilters, view: "week" })}`
      : null,
  );
  const m = query.data?.summary;
  const daily = query.data?.daily;
  const weekly = query.data?.weekly;
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            INDICADORES ·{" "}
            {mode === "day"
              ? "DÍA"
              : mode === "week"
                ? "SEMANA TÍPICA"
                : "COMPARACIÓN"}
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
          Semana típica
        </Button>
        <Button
          variant={mode === "compare" ? "default" : "outline"}
          onClick={() => change({ mode: "compare" })}
        >
          Comparar períodos
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
          periodControls(
            mode === "compare" ? "Período A" : "Período",
            "",
            { period: "period", from: "from", to: "to" },
            first,
          )
        )}
        {mode === "compare" &&
          periodControls(
            "Período B",
            " (B)",
            { period: "periodB", from: "fromB", to: "toB" },
            second,
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
        <label>
          Edificio
          <select
            aria-label="Edificio"
            value={location}
            onChange={(e) => change({ location: e.target.value })}
          >
            <option value="">Todos los edificios</option>
            {locations.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
        <label>
          Piso
          <select
            aria-label="Piso"
            value={floor}
            onChange={(e) => change({ floor: e.target.value })}
          >
            <option value="">Todos los pisos</option>
            {floors.map((f) => (
              <option key={f} value={String(f)}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <label>
          Capacidad mínima (personas)
          <input
            type="number"
            min="0"
            placeholder="Sin mínimo"
            value={minCapacity}
            onChange={(e) => change({ minCapacity: e.target.value })}
          />
        </label>
        <label>
          Capacidad máxima (personas)
          <input
            type="number"
            min="0"
            placeholder="Sin máximo"
            value={maxCapacity}
            onChange={(e) => change({ maxCapacity: e.target.value })}
          />
        </label>
        <fieldset className="metric-resources">
          <legend>Recursos del aula</legend>
          {(Object.keys(resourceLabels) as Resource[]).map((r) => (
            <label key={r}>
              <input
                type="checkbox"
                checked={resources.includes(r)}
                onChange={(e) =>
                  change({
                    resources: (e.target.checked
                      ? [...resources, r]
                      : resources.filter((x) => x !== r)
                    ).join(","),
                  })
                }
              />
              {resourceLabels[r]}
            </label>
          ))}
        </fieldset>
      </section>
      {!valid ? (
        <p role="alert">
          Elegí una fecha o rango válido (inicio anterior o igual al fin).
        </p>
      ) : !capacityValid ? (
        <p role="alert">
          La capacidad máxima no puede ser menor que la mínima.
        </p>
      ) : !roomValid ? (
        <p role="alert">Seleccioná un aula registrada.</p>
      ) : mode === "compare" ? (
        query.error || compared.error ? (
          <section className="panel" role="alert">
            <h2>No pudimos consultar los indicadores</h2>
            <p>{query.error || compared.error}</p>
            <Button
              onClick={() => {
                query.retry();
                compared.retry();
              }}
            >
              Reintentar consulta
            </Button>
          </section>
        ) : !query.data || !compared.data ? (
          <p role="status">Consultando indicadores…</p>
        ) : (
          <MetricComparison
            a={{
              label: first.label,
              range: `${first.from} — ${first.to}`,
              data: query.data,
            }}
            b={{
              label: second.label,
              range: `${second.from} — ${second.to}`,
              data: compared.data,
            }}
          />
        )
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
          {m.eligible && !m.unknownCoverage && !m.availableHours && (
            <p className="closed-notice">
              <strong>Sin horas habilitadas</strong>. La ocupación no se calcula
              para los filtros elegidos.
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
            {/* Without a computable occupancy the card is left out; the notice above says why. */}
            {m.occupancy !== null && (
              <article className="panel metric-card">
                <ChartPie />
                <div>
                  <span>Ocupación</span>
                  <strong>
                    {m.occupancy > 0 && m.occupancy < 0.05
                      ? "< 0,1"
                      : number(m.occupancy)}{" "}
                    %
                  </strong>
                  <small>
                    {number(m.hours)} / {number(m.availableHours)} h habilitadas
                  </small>
                </div>
              </article>
            )}
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
            <MetricWeek
              key={`${from}:${to}:${new URLSearchParams(roomFilters)}`}
              data={weekly}
            />
          )}
          {daily && m.eligible && (
            <>
              <Suspense fallback={<p role="status">Cargando gráficos…</p>}>
                <MetricCurve
                  slots={daily.slots}
                  metric="students"
                  title="Alumnos previstos"
                  onSelect={setSelectedSlot}
                  peak={{
                    value: daily.peakStudents,
                    slots: daily.peakStudentSlots,
                  }}
                />
                <MetricCurve
                  slots={daily.slots}
                  metric="classes"
                  title="Clases simultáneas"
                  onSelect={setSelectedSlot}
                  peak={{
                    value: daily.peakClasses,
                    slots: daily.peakClassSlots,
                  }}
                />
              </Suspense>
              <section className="panel daily-slot">
                <label>
                  Franja del día
                  <select
                    aria-label="Franja del día"
                    value={selectedSlot}
                    onChange={(e) => setSelectedSlot(Number(e.target.value))}
                  >
                    {daily.slots.map((s, i) => (
                      <option key={s.start} value={i}>
                        {s.start}–{s.end}
                      </option>
                    ))}
                  </select>
                </label>
                <p role="status">
                  {daily.slots[selectedSlot].students} alumnos previstos ·{" "}
                  {daily.slots[selectedSlot].classes} clases simultáneas · 1
                  fecha aportante.
                </p>
              </section>
              <details className="panel metric-values">
                <summary>Ver las 32 franjas y sus valores</summary>
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
            </>
          )}
          <div className="panel metric-volume">
            <strong>{number(query.data!.studentHours)}</strong>
            <span>alumnos-hora</span>
          </div>
          <p className="metric-note">
            Estimación con 100 % de asistencia. No representa personas únicas ni
            asistencia observada. Las clases pueden compartir alumnos.
          </p>
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
