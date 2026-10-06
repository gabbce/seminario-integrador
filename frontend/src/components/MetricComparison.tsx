import type { IndicatorSeries } from "../indicator-api";

const number = (n: number) =>
  new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(n);
const signed = (n: number) =>
  `${n > 0 ? "+" : n < 0 ? "−" : ""}${number(Math.abs(n))}`;

export type ComparedPeriod = {
  label: string;
  range: string;
  data: IndicatorSeries;
};

/** Same formulas as each period's own view; totals are divided by eligible days because periods differ in length. */
function measures(data: IndicatorSeries) {
  const days = data.weekly?.week.reduce((n, d) => n + d.dates.length, 0) ?? 0;
  const perDay = (value: number) => (days ? value / days : null);
  return {
    days,
    occupancy: data.summary.occupancy,
    hours: perDay(data.summary.hours),
    classes: perDay(data.summary.classes),
    studentHours: perDay(data.studentHours),
    peakStudents: data.weekly?.peakStudents ?? null,
    peakClasses: data.weekly?.peakClasses ?? null,
  };
}

/** Two periods side by side with B − A (DA-88). No new metric: only the ones each period already shows. */
export function MetricComparison({
  a,
  b,
}: {
  a: ComparedPeriod;
  b: ComparedPeriod;
}) {
  const x = measures(a.data),
    y = measures(b.data);
  const rows = [
    {
      label: "Ocupación",
      unit: " %",
      diff: " p. p.",
      a: x.occupancy,
      b: y.occupancy,
    },
    {
      label: "Horas reservadas por día hábil",
      unit: " h",
      diff: " h",
      a: x.hours,
      b: y.hours,
    },
    {
      label: "Clases por día hábil",
      unit: "",
      diff: "",
      a: x.classes,
      b: y.classes,
    },
    {
      label: "Alumnos-hora por día hábil",
      unit: "",
      diff: "",
      a: x.studentHours,
      b: y.studentHours,
    },
    {
      label: "Pico promedio de alumnos simultáneos",
      unit: "",
      diff: "",
      a: x.peakStudents,
      b: y.peakStudents,
    },
    {
      label: "Pico promedio de clases simultáneas",
      unit: "",
      diff: "",
      a: x.peakClasses,
      b: y.peakClasses,
    },
  ];
  const value = (n: number | null, unit: string) =>
    n === null ? "—" : `${number(n)}${unit}`;
  return (
    <section
      className="panel metric-comparison"
      aria-label="Comparación de períodos"
    >
      <h2>Comparación de períodos</h2>
      <div className="metric-table">
        <table>
          <thead>
            <tr>
              <th>Indicador</th>
              <th>
                A · {a.label}
                <small>{a.range}</small>
              </th>
              <th>
                B · {b.label}
                <small>{b.range}</small>
              </th>
              <th>Diferencia (B − A)</th>
            </tr>
          </thead>
          <tbody>
            {/* A row with no data in either period says nothing: leave it out. */}
            {rows
              .filter((r) => r.a !== null || r.b !== null)
              .map((r) => (
                <tr key={r.label}>
                  <th scope="row">{r.label}</th>
                  <td>{value(r.a, r.unit)}</td>
                  <td>{value(r.b, r.unit)}</td>
                  <td>
                    {r.a === null || r.b === null
                      ? "—"
                      : `${signed(r.b - r.a)}${r.diff}`}
                  </td>
                </tr>
              ))}
            <tr>
              <th scope="row">Días hábiles considerados</th>
              <td>{x.days}</td>
              <td>{y.days}</td>
              <td>—</td>
            </tr>
          </tbody>
        </table>
      </div>
      {(
        [
          ["A", a],
          ["B", b],
        ] as const
      ).map(([name, side]) => (
        <div key={name}>
          {side.data.summary.unknownCoverage && (
            <p className="closed-notice">
              Período {name}: cobertura histórica desconocida. Su ocupación no
              se calcula y no se compara.
            </p>
          )}
          {!side.data.summary.eligible && (
            <p className="closed-notice">
              Período {name}: sin días hábiles aplicables.
            </p>
          )}
        </div>
      ))}
      <p className="metric-note">
        Se comparan la ocupación y promedios por día hábil, no totales, porque
        los períodos pueden tener distinta cantidad de días. Ambos períodos usan
        las mismas fórmulas y los mismos filtros de aulas. Estimación con 100 %
        de asistencia.
      </p>
    </section>
  );
}
