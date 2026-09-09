import { useRooms } from "../room-context";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Printer } from "lucide-react";
import { type Booking, dateLabel } from "../domain";
import { listingRows, type ListFilters } from "../listing";
import { Button } from "../components/ui/button";
export function Listing({ bookings }: { bookings: Booking[] }) {
  const rooms = useRooms();
  const go = useNavigate();
  const [filters, setFilters] = useState<ListFilters>({
    mode: "day",
    date: "2026-09-14",
    course: bookings[0]?.course ?? "",
    room: "",
    type: "",
    status: "active",
  });
  const [size, setSize] = useState(20),
    [page, setPage] = useState(0);
  const rows = listingRows(bookings, filters, rooms);
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const current = Math.min(page, pages - 1);
  function change(patch: Partial<ListFilters>) {
    setFilters((old) => ({ ...old, ...patch }));
    setPage(0);
  }
  function table(print = false) {
    const shown = print
      ? rows
      : rows.slice(current * size, (current + 1) * size);
    return (
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
          {shown.map(({ booking: b, occurrence: o, type }, i) => (
            <tr key={`${b.id}-${o.date}-${i}`}>
              <td>{type}</td>
              <td>{dateLabel(o.date)}</td>
              <td>
                {o.start}–{o.end}
              </td>
              <td>{o.room}</td>
              <td>
                {print ? (
                  <strong>{b.subject}</strong>
                ) : (
                  <button
                    className="table-link"
                    onClick={() => go(`/reservas/${b.id}`)}
                  >
                    {b.subject}
                  </button>
                )}
                <small>
                  {b.course} · {b.teacher}
                </small>
              </td>
              <td>{o.cancelled ? "Cancelada" : "Confirmada"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  return (
    <>
      <div className="screen-list">
        <div className="page-heading">
          <div>
            <p className="eyebrow">CONSULTAS</p>
            <h1>Reservas</h1>
          </div>
          {filters.mode === "day" && (
            <Button variant="outline" onClick={() => window.print()}>
              <Printer />
              Imprimir listado diario
            </Button>
          )}
        </div>
        <div className="toolbar">
          <div className="actions">
            <Button
              variant={filters.mode === "day" ? "default" : "outline"}
              onClick={() => change({ mode: "day" })}
            >
              Por día
            </Button>
            <Button
              variant={filters.mode === "course" ? "default" : "outline"}
              onClick={() => change({ mode: "course" })}
            >
              Por curso
            </Button>
          </div>
        </div>
        <section className="panel list-filters">
          <label>
            {filters.mode === "day" ? "Fecha" : "Curso"}
            {filters.mode === "day" ? (
              <input
                type="date"
                aria-label="Fecha del listado"
                value={filters.date}
                onChange={(e) =>
                  e.target.value && change({ date: e.target.value })
                }
              />
            ) : (
              <select
                aria-label="Curso del listado"
                value={filters.course}
                onChange={(e) => change({ course: e.target.value })}
              >
                {[...new Map(bookings.map((b) => [b.course, b])).values()].map(
                  (b) => (
                    <option key={b.course} value={b.course}>
                      {b.subject} · {b.course}
                    </option>
                  ),
                )}
              </select>
            )}
          </label>
          <label>
            Tipo
            <select
              aria-label="Tipo del listado"
              value={filters.type}
              onChange={(e) => change({ type: e.target.value })}
            >
              <option value="">Todos</option>
              {["General", "Multimedios", "Laboratorio"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label>
            Aula
            <select
              aria-label="Aula del listado"
              value={filters.room}
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
              value={filters.status}
              onChange={(e) =>
                change({ status: e.target.value as ListFilters["status"] })
              }
            >
              <option value="active">Confirmadas</option>
              <option value="cancelled">Canceladas</option>
              <option value="all">Todas</option>
            </select>
          </label>
        </section>
        <p className="muted">
          {rows.length} {rows.length === 1 ? "resultado" : "resultados"} ·{" "}
          {filters.mode === "day"
            ? "Agrupados por tipo de aula"
            : "Orden cronológico"}
        </p>
        <p className="table-scroll-hint">
          Deslizá la tabla para ver todas las columnas.
        </p>
        {rows.length ? (
          <div
            className="listing-table"
            tabIndex={0}
            role="region"
            aria-label="Resultados de reservas"
          >
            {table()}
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
              onChange={(e) => {
                setSize(Number(e.target.value));
                setPage(0);
              }}
            >
              {[20, 50, 100].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <Button
            variant="outline"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
          >
            Anterior
          </Button>
          <span>
            Página {current + 1} de {pages}
          </span>
          <Button
            variant="outline"
            disabled={current >= pages - 1}
            onClick={() => setPage(current + 1)}
          >
            Siguiente
          </Button>
        </div>
      </div>
      {filters.mode === "day" && (
        <section className="print-list">
          <h1>Reservas · {dateLabel(filters.date)}</h1>
          <p>
            Tipo: {filters.type || "Todos"} · Aula: {filters.room || "Todas"} ·
            Estado:{" "}
            {filters.status === "all"
              ? "Todas"
              : filters.status === "active"
                ? "Confirmadas"
                : "Canceladas"}
          </p>
          <p>
            {rows.length} {rows.length === 1 ? "resultado" : "resultados"}
          </p>
          {table(true)}
        </section>
      )}
    </>
  );
}
