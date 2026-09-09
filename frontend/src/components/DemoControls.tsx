import { useState } from "react";
import { scenarioOptions, type ScenarioId } from "../demo-scenarios";
import { Button } from "./ui/button";
export function DemoControls({
  current,
  now,
  apply,
}: {
  current: ScenarioId;
  now: string;
  apply: (id: ScenarioId) => void;
}) {
  const [selected, setSelected] = useState<ScenarioId>(current);
  return (
    <aside className="demo-controls">
      <details>
        <summary>
          Herramientas de demostración ·{" "}
          {scenarioOptions.find((s) => s[0] === current)?.[1]}
        </summary>
        <p>
          Escenarios independientes con datos ficticios. Aplicar o reiniciar
          descarta los cambios, restablece cuentas y contraseñas, y vuelve al
          ingreso.
        </p>
        <p>
          Reloj institucional: {now.replace("T", " · ")} ·
          America/Argentina/Cordoba
        </p>
        <label>
          Escenario
          <select
            aria-label="Escenario"
            value={selected}
            onChange={(e) => setSelected(e.target.value as ScenarioId)}
          >
            {scenarioOptions.map((s) => (
              <option key={s[0]} value={s[0]}>
                {s[1]}
              </option>
            ))}
          </select>
        </label>
        <p>{scenarioOptions.find((s) => s[0] === selected)?.[2]}</p>
        <div className="metric-toggle">
          <Button onClick={() => apply(selected)}>
            Aplicar escenario y reiniciar
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setSelected(current);
              apply(current);
            }}
          >
            Reiniciar escenario actual
          </Button>
        </div>
        <p>
          Acceso de prueba: admin@demo.local, bedel@demo.local o
          docente@demo.local · Contraseña: Aulas2026.
        </p>
      </details>
    </aside>
  );
}
