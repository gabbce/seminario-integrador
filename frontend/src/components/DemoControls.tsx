import { useState } from "react";
import { scenarioOptions, type ScenarioId } from "../demo-scenarios";
import { Button } from "./ui/button";
export function DemoControls({
  current,
  now,
  apply,
  queryMode,
  saveMode,
  simulateSave,
  simulateQuery,
  simulateAction,
}: {
  saveMode: "normal" | "error" | "uncertain";
  simulateSave: (mode: "normal" | "error" | "uncertain") => void;
  queryMode: "normal" | "error" | "slow";
  simulateQuery: (mode: "normal" | "error" | "slow") => void;
  simulateAction: (kind: "expire" | "version" | "occupy") => void;
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
        <h3>Pruebas de recuperación</h3>
        <p>
          Consulta de indicadores: {queryMode}. Cambiar filtros durante una
          respuesta lenta conserva únicamente la consulta actual. Estas pruebas
          no envían solicitudes reales.
        </p>
        <div className="metric-toggle">
          <Button variant="outline" onClick={() => simulateQuery("error")}>
            Simular error de indicadores
          </Button>
          <Button variant="outline" onClick={() => simulateQuery("slow")}>
            Simular respuesta lenta
          </Button>
          <Button variant="outline" onClick={() => simulateQuery("normal")}>
            Respuesta normal
          </Button>
          <Button variant="outline" onClick={() => simulateAction("expire")}>
            Simular sesión vencida
          </Button>
          <Button variant="outline" onClick={() => simulateAction("version")}>
            Simular otra versión de reserva
          </Button>
        </div>
        <p>
          Guardado de reserva nueva: {saveMode}. El resultado incierto se
          registra en memoria, pero exige comprobarlo antes de mostrar éxito.
        </p>
        <div className="metric-toggle">
          <Button variant="outline" onClick={() => simulateQuery("error")}>
            Simular error de disponibilidad
          </Button>
          <Button variant="outline" onClick={() => simulateAction("occupy")}>
            Ocupar Aula 203 · 14 y 21/09 · 14–16
          </Button>
          <Button variant="outline" onClick={() => simulateSave("error")}>
            Simular fallo de guardado
          </Button>
          <Button variant="outline" onClick={() => simulateSave("uncertain")}>
            Simular respuesta de guardado incierta
          </Button>
          <Button variant="outline" onClick={() => simulateSave("normal")}>
            Guardado normal
          </Button>
        </div>
      </details>
    </aside>
  );
}
