import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useRooms } from "../room-context";
import { useConsultation } from "../consultations";
import { institutionalNow } from "../institutional-time";
import { dateLabel } from "../domain";
import type { Course } from "../catalog";
import { Button } from "../components/ui/button";

export function PersistedListing({ courses }: { courses: Course[] }) {
  const rooms = useRooms();
  const go = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const mode = params.get("mode") === "course" ? "course" : "day";
  const date = params.get("date") || institutionalNow().slice(0, 10);
  const courseId = params.get("courseId") || courses[0]?.id || "";
  const course = courses.find((c) => c.id === courseId);
  const room = params.get("room") ?? "",
    type = params.get("type") ?? "";
  const status = params.get("status") || "active";
  const page = Math.max(0, Number(params.get("page")) || 0);
  const size = [20, 50, 100].includes(Number(params.get("size")))
    ? Number(params.get("size"))
    : 20;
  function change(patch: Record<string, string>, reset = true) {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => next.set(k, v));
    if (reset) next.set("page", "0");
    setParams(next, { replace: true });
  }
  const filters = new URLSearchParams({
    mode,
    date,
    courseId,
    year: String(course?.year ?? ""),
    room,
    type,
    status,
    page: String(page),
    size: String(size),
  });
  const query = useConsultation(
    mode === "course" && !course ? null : `/consultas/listado?${filters}`,
  );
  const pages = Math.max(1, Math.ceil((query.data?.total ?? 0) / size));
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">CONSULTAS</p>
          <h1>Reservas</h1>
        </div>
      </div>
      <div className="toolbar">
        <div className="actions">
          <Button
            variant={mode === "day" ? "default" : "outline"}
            onClick={() => change({ mode: "day" })}
          >
            Por día
          </Button>
          <Button
            variant={mode === "course" ? "default" : "outline"}
            onClick={() => change({ mode: "course" })}
          >
            Por curso
          </Button>
        </div>
      </div>
      <section className="panel list-filters">
        <label>
          {mode === "day" ? "Fecha" : "Curso y año"}
          {mode === "day" ? (
            <input
              type="date"
              aria-label="Fecha del listado"
              value={date}
              onChange={(e) =>
                e.target.value && change({ date: e.target.value })
              }
            />
          ) : (
            <select
              aria-label="Curso del listado"
              value={courseId}
              onChange={(e) => change({ courseId: e.target.value })}
            >
              {!courses.length && (
                <option value="">Sin cursos registrados</option>
              )}
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.subject} · {String(c.code).padStart(3, "0")}-{c.commission}
                  -{c.year}
                </option>
              ))}
            </select>
          )}
        </label>
        <label>
          Tipo
          <select
            aria-label="Tipo del listado"
            value={type}
            onChange={(e) => change({ type: e.target.value })}
          >
            <option value="">Todos</option>
            {["General", "Multimedios", "Laboratorio", "Sin historia"].map(
              (t) => (
                <option key={t}>{t}</option>
              ),
            )}
          </select>
        </label>
        <label>
          Aula
          <select
            aria-label="Aula del listado"
            value={room}
            onChange={(e) => change({ room: e.target.value })}
          >
            <option value="">Todas</option>
            {rooms.map((r) => (
              <option key={r.id}>{r.id}</option>
            ))}
          </select>
        </label>
        <label>
          Estado
          <select
            aria-label="Estado del listado"
            value={status}
            onChange={(e) => change({ status: e.target.value })}
          >
            <option value="active">Confirmadas</option>
            <option value="cancelled">Canceladas</option>
            <option value="all">Todas</option>
          </select>
        </label>
      </section>
      {mode === "course" && !course ? (
        <section className="panel">Seleccioná un curso registrado.</section>
      ) : query.error ? (
        <section className="panel" role="alert">
          {query.error}{" "}
          <Button onClick={query.retry}>Reintentar consulta</Button>
        </section>
      ) : !query.data ? (
        <p role="status">Cargando listado…</p>
      ) : (
        <>
          <p className="muted">
            {query.data.total}{" "}
            {query.data.total === 1 ? "resultado" : "resultados"} ·{" "}
            {mode === "day"
              ? "Agrupados por tipo de aula"
              : "Orden cronológico"}
          </p>
          <p className="table-scroll-hint">
            Deslizá la tabla para ver todas las columnas.
          </p>
          {query.data.rows.length ? (
            <div
              className="listing-table"
              tabIndex={0}
              role="region"
              aria-label="Resultados de reservas"
            >
              <table>
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Fecha</th>
                    <th>Horario</th>
                    <th>Aula</th>
                    <th>Curso y docente</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.rows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.type}</td>
                      <td>{dateLabel(r.date)}</td>
                      <td>
                        {r.start}–{r.end}
                      </td>
                      <td>{r.room}</td>
                      <td>
                        <button
                          className="table-link"
                          onClick={() =>
                            go(`/reservas/${r.bookingId}`, {
                              state: {
                                returnTo: location.pathname + location.search,
                              },
                            })
                          }
                        >
                          {r.subject}
                        </button>
                        <small>
                          {r.course} · {r.teacher}
                        </small>
                      </td>
                      <td>{r.cancelled ? "Cancelada" : "Confirmada"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <section className="panel">
              No hay reservas para estos filtros.
            </section>
          )}
          <div className="pagination">
            <label>
              Resultados por página
              <select
                aria-label="Resultados por página"
                value={size}
                onChange={(e) => change({ size: e.target.value })}
              >
                {[20, 50, 100].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
            <Button
              variant="outline"
              disabled={page === 0}
              onClick={() => change({ page: String(page - 1) }, false)}
            >
              Anterior
            </Button>
            <span>
              Página {page + 1} de {pages}
            </span>
            <Button
              variant="outline"
              disabled={page + 1 >= pages}
              onClick={() => change({ page: String(page + 1) }, false)}
            >
              Siguiente
            </Button>
          </div>
        </>
      )}
    </>
  );
}
