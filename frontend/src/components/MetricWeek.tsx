import { useState } from "react";
import type { rangeMetrics } from "../metrics";
import { dayNames } from "../domain";
import { Button } from "./ui/button";
const number = (n: number) =>
  new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(n);
export function MetricWeek({
  data,
}: {
  data: NonNullable<ReturnType<typeof rangeMetrics>>;
}) {
  const [metric, setMetric] = useState<"students" | "classes">("students");
  const [selected, setSelected] = useState<{
    day: number;
    slot: number;
  } | null>(null);
  const max = Math.max(
    0,
    ...data.week.flatMap((d) => d.slots.map((s) => s[metric] ?? 0)),
  );
  const selectedDay = selected
    ? data.week.find((d) => d.day === selected.day)
    : null;
  const selectedSlot =
    selectedDay && selected ? selectedDay.slots[selected.slot] : null;
  const maxVolume = Math.max(1, ...data.week.map((d) => d.studentHours ?? 0));
  return (
    <>
      <section className="panel weekly-panel">
        <div className="metric-curve-heading">
          <h2>Semana típica</h2>
          <div className="metric-toggle" aria-label="Métrica del mapa">
            <Button
              variant={metric === "students" ? "default" : "outline"}
              onClick={() => setMetric("students")}
            >
              Alumnos previstos
            </Button>
            <Button
              variant={metric === "classes" ? "default" : "outline"}
              onClick={() => setMetric("classes")}
            >
              Clases simultáneas
            </Button>
          </div>
        </div>
        <p>
          Media por franja de 30 minutos. Incluye fechas lectivas sin clases;
          excluye feriados. Desplazá el mapa para ver el día completo.
        </p>
        <div
          className="heat-scroll"
          role="region"
          aria-label="Mapa de semana típica"
          tabIndex={0}
        >
          <table className="heat-table">
            <thead>
              <tr>
                <th>Día / fechas</th>
                {data.week[0].slots.map((s, i) => (
                  <th key={s.start} scope="col">
                    {i % 4 === 0 ? (
                      s.start
                    ) : (
                      <span className="sr-only">{s.start}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.week.map((d) => (
                <tr key={d.day}>
                  <th scope="row">
                    {dayNames[d.day]}
                    <small>{d.dates.length} fechas</small>
                  </th>
                  {d.slots.map((s, i) => {
                    const value = s[metric];
                    const text =
                      value === null
                        ? "Sin datos aplicables"
                        : `${number(value)} ${metric === "students" ? "alumnos previstos" : "clases simultáneas"} de media`;
                    return (
                      <td key={s.start}>
                        <button
                          type="button"
                          className="heat-cell"
                          aria-label={`${dayNames[d.day]} ${s.start}–${s.end}: ${text}; ${d.dates.length} fechas`}
                          aria-pressed={
                            selected?.day === d.day && selected.slot === i
                          }
                          style={{
                            background:
                              value === null
                                ? "repeating-linear-gradient(135deg,#eee 0 3px,#fff 3px 6px)"
                                : value === 0
                                  ? "#f4f2ec"
                                  : `rgba(24,83,64,${0.2 + (0.8 * value) / Math.max(1, max)})`,
                          }}
                          onFocus={() => setSelected({ day: d.day, slot: i })}
                          onClick={() => setSelected({ day: d.day, slot: i })}
                        >
                          <span className="sr-only">{text}</span>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="heat-legend">
          <span className="heat-zero" /> 0 <span className="heat-max" />{" "}
          {number(max)}{" "}
          {metric === "students" ? "alumnos previstos" : "clases simultáneas"}{" "}
          de media · Rayado: sin datos aplicables
        </p>
        <div className="heat-selection" role="status">
          {selectedSlot && selectedDay ? (
            <>
              <strong>
                {dayNames[selectedDay.day]} · {selectedSlot.start}–
                {selectedSlot.end}
              </strong>
              <p>
                {selectedSlot.students === null
                  ? "Sin datos aplicables"
                  : `${number(selectedSlot.students)} alumnos previstos y ${number(selectedSlot.classes!)} clases simultáneas de media · ${selectedDay.dates.length} fechas aportantes.`}
              </p>
            </>
          ) : (
            <p>
              Elegí una franja con clic, toque o teclado para consultar sus
              valores.
            </p>
          )}
        </div>
        <p>
          Pico de la curva promedio:{" "}
          <strong>
            {data.eligible
              ? `${number(max)} ${metric === "students" ? "alumnos previstos" : "clases simultáneas"}`
              : "Sin datos aplicables"}
          </strong>
          . No es el máximo de una fecha concreta.
        </p>
      </section>
      <section className="panel weekly-comparison">
        <h2>Comparación entre días</h2>
        <p>
          Media diaria de alumnos-hora, clases programadas y pico de la curva
          promedio.
        </p>
        <div className="volume-bars">
          {data.week.map((d) => (
            <div key={d.day}>
              <span>{dayNames[d.day]}</span>
              <div>
                <span
                  style={{
                    width: `${(100 * (d.studentHours ?? 0)) / maxVolume}%`,
                  }}
                />
              </div>
              <strong>
                {d.studentHours === null
                  ? "Sin datos"
                  : `${number(d.studentHours)} alumnos-hora`}
              </strong>
            </div>
          ))}
        </div>
        <div className="metric-table">
          <table>
            <thead>
              <tr>
                <th>Día</th>
                <th>Fechas</th>
                <th>Media de clases/día</th>
                <th>Pico de alumnos de la curva promedio</th>
                <th>Mayor pico de una fecha concreta</th>
              </tr>
            </thead>
            <tbody>
              {data.week.map((d) => (
                <tr key={d.day}>
                  <th scope="row">{dayNames[d.day]}</th>
                  <td>{d.dates.length}</td>
                  <td>{d.classes === null ? "—" : number(d.classes)}</td>
                  <td>
                    {d.peakStudents === null ? "—" : number(d.peakStudents)}
                  </td>
                  <td>
                    {d.peakDateStudents === null
                      ? "—"
                      : number(d.peakDateStudents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
