import { Button } from "./ui/button";
import { minutes, type Occurrence } from "../domain";
export function SporadicDates({
  dates,
  year = 2026,
  change,
}: {
  dates: Occurrence[];
  year?: number;
  change: (dates: Occurrence[]) => void;
}) {
  function update(index: number, patch: Partial<Occurrence>) {
    change(
      dates.map((o, i) => (i === index ? { ...o, ...patch, room: "" } : o)),
    );
  }
  return (
    <section className="section-divider">
      <h2>Fechas y horarios</h2>
      <p className="muted">
        Cada fecha puede tener un horario y un aula diferentes. También podés
        reservar durante el receso.
      </p>
      {dates.map((o, index) => (
        <fieldset className="sporadic-date" key={index}>
          <legend>Clase {index + 1}</legend>
          <div className="form-grid">
            <label>
              Fecha
              <input
                type="date"
                min={`${year}-01-01`}
                max={`${year}-12-31`}
                required
                value={o.date}
                onChange={(e) => update(index, { date: e.target.value })}
              />
            </label>
            <label>
              Inicio
              <input
                type="time"
                min="07:00"
                max="22:30"
                step="1800"
                required
                value={o.start}
                onChange={(e) => {
                  const end =
                    minutes(e.target.value) + minutes(o.end) - minutes(o.start);
                  update(index, {
                    start: e.target.value,
                    end: `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`,
                  });
                }}
              />
            </label>
            <label>
              Duración
              <select
                value={minutes(o.end) - minutes(o.start)}
                onChange={(e) => {
                  const end = minutes(o.start) + Number(e.target.value);
                  update(index, {
                    end: `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`,
                  });
                }}
              >
                {Array.from({ length: 32 }, (_, i) => (i + 1) * 30).map((n) => (
                  <option key={n} value={n}>
                    {n / 60} h
                  </option>
                ))}
              </select>
            </label>
            <p>
              Finaliza: <strong>{o.end}</strong>
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => change(dates.filter((_, i) => i !== index))}
          >
            Quitar fecha {index + 1}
          </Button>
        </fieldset>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={() =>
          change([
            ...dates,
            { date: "", start: "14:00", end: "16:00", room: "" },
          ])
        }
      >
        Agregar fecha
      </Button>
    </section>
  );
}
