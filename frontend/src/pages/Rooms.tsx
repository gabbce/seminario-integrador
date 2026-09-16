import { FormError, FieldError } from "../components/FormError";
import { useState, useEffect } from "react";
import { type Room, type Role } from "../domain";
import { api } from "../api";
import { resourceLabels, resourcesFor } from "../equipment";
import { Button } from "../components/ui/button";
type RoomPage = {
  items: Room[];
  total: number;
  page: number;
  size: number;
  enabled: number;
};
export function Rooms({ role }: { role: Role }) {
  const [data, setData] = useState<RoomPage>();
  const [loadError, setLoadError] = useState("");
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [resource, setResource] = useState("");
  const [board, setBoard] = useState("");
  const [selected, setSelected] = useState<Room>();
  const [originalId, setOriginalId] = useState<string>();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [state, setState] = useState("");
  const [capacity, setCapacity] = useState(0);
  const [order, setOrder] = useState("id");
  const [descending, setDescending] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    api<RoomPage>(
      `/aulas?${new URLSearchParams({ query, type, state, board, resource, capacity: String(capacity), sort: order, descending: String(descending), page: String(page), size: String(pageSize) })}`,
      { signal: controller.signal },
    )
      .then((result) => {
        if (active) {
          setData(result);
          setLoadError("");
        }
      })
      .catch((e) => {
        if (active) setLoadError(e.message);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [
    query,
    type,
    state,
    board,
    resource,
    capacity,
    order,
    descending,
    page,
    pageSize,
    revision,
  ]);
  const rooms = data?.items ?? [];
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));
  const currentPage = data?.page ?? page;
  const visible = loadError ? [] : rooms;
  function edit(room: Room | undefined) {
    setSelected(
      room ?? {
        id: "",
        type: "General",
        capacity: 30,
        state: "Habilitada",
        location: "",
        floor: 0,
        board: "Fibrón",
        resources: [],
      },
    );
    setOriginalId(room?.id);
    setError("");
    setMessage("");
    setConfirmDelete(false);
  }
  function patch(p: Partial<Room>) {
    if (selected) setSelected({ ...selected, ...p });
    setError("");
    setConfirmDelete(false);
  }
  async function persist(room: Room) {
    if (busy) return;
    setBusy(true);
    try {
      const saved = await api<Room>(room.internalId ? `/aulas/${room.internalId}` : "/aulas", {
        method: room.internalId ? "PUT" : "POST",
        body: JSON.stringify(room),
      });
      setData(current => current ? { ...current, items: current.items.map(item => item.internalId === saved.internalId ? saved : item) } : current);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
      return;
    } finally {
      setBusy(false);
    }
    setRevision((r) => r + 1);
    window.dispatchEvent(new Event("aulas-inventory-refresh"));
    setSelected(undefined);
    setMessage(
      room.state === "Baja"
        ? "Aula dada de baja. Se conserva su historial."
        : "Aula guardada. La disponibilidad usa los datos actualizados.",
    );
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Aulas</h1>
          <p>Inventario de espacios · {data?.enabled ?? 0} habilitados</p>
        </div>
        {role !== "Docente" && (
          <Button onClick={() => edit(undefined)}>Nueva aula</Button>
        )}
      </div>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      <div className={selected ? "cancellation-layout inventory-layout" : ""}>
        <section className="panel">
          <div className="form-grid">
            <label>
              Buscar aula
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
            </label>
            <label>
              Tipo
              <select
                aria-label="Tipo de inventario"
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Todos</option>
                {["General", "Multimedios", "Laboratorio"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label>
              Estado
              <select
                aria-label="Estado de inventario"
                value={state}
                onChange={(e) => {
                  setState(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Operación habitual</option>
                {["Habilitada", "Inhabilitada", "Mantenimiento", "Baja"].map(
                  (t) => (
                    <option key={t}>{t}</option>
                  ),
                )}
              </select>
            </label>
            <label>
              Capacidad mínima (personas)
              <input
                type="number"
                min="0"
                value={capacity}
                onChange={(e) => {
                  setCapacity(Number(e.target.value));
                  setPage(1);
                }}
              />
            </label>
          </div>
          <details>
            <summary>Filtrar características</summary>
            <div className="form-grid">
              <label>
                Recurso
                <select
                  aria-label="Recurso del inventario"
                  value={resource}
                  onChange={(e) => {
                    setResource(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Cualquiera</option>
                  {Object.entries(resourceLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Pizarrón
                <select
                  aria-label="Pizarrón del inventario"
                  value={board}
                  onChange={(e) => {
                    setBoard(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Cualquiera</option>
                  <option>Tiza</option>
                  <option>Fibrón</option>
                </select>
              </label>
            </div>
          </details>
          <div className="form-grid">
            <label>
              Ordenar aulas por
              <select
                value={order}
                onChange={(e) => {
                  setOrder(e.target.value);
                  setPage(1);
                }}
              >
                <option value="id">Identificador</option>
                <option value="capacity">Capacidad</option>
                <option value="type">Tipo</option>
                <option value="state">Estado</option>
              </select>
            </label>
            <label>
              Sentido del orden
              <select
                value={descending ? "desc" : "asc"}
                onChange={(e) => {
                  setDescending(e.target.value === "desc");
                  setPage(1);
                }}
              >
                <option value="asc">Ascendente</option>
                <option value="desc">Descendente</option>
              </select>
            </label>
          </div>
          <div className="inventory-list">
            {visible.map((r) => (
              <article key={r.id}>
                <div>
                  <strong>Aula {r.id}</strong>
                  <p>
                    {r.type} · {r.capacity} personas · {r.state}
                  </p>
                  <small>
                    {r.location} · Piso {r.floor}
                  </small>
                </div>
                <Button variant="outline" onClick={() => edit(r)}>
                  {role === "Docente" || r.state === "Baja" ? "Ver" : "Editar"}{" "}
                  {r.id}
                </Button>
              </article>
            ))}
          </div>
          {loadError && (
            <div role="alert">
              {loadError}
              <Button onClick={() => setRevision((r) => r + 1)}>
                Reintentar
              </Button>
            </div>
          )}
          {!data && !loadError && <p role="status">Cargando aulas…</p>}
          <nav className="pagination" aria-label="Paginación de aulas">
            <label>
              Aulas por página
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                {[20, 50, 100].map((size) => (
                  <option key={size}>{size}</option>
                ))}
              </select>
            </label>
            <span role="status">
              {data?.total ?? 0} aulas · Página {currentPage} de {pages}
            </span>
            <Button
              variant="outline"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              disabled={currentPage === pages}
              onClick={() => setPage(currentPage + 1)}
            >
              Siguiente
            </Button>
          </nav>
          {data && !loadError && !data.total && (
            <p role="status">No hay aulas que coincidan con los filtros.</p>
          )}
        </section>
        {selected && (
          <form
            className="panel"
            onSubmit={(e) => {
              e.preventDefault();
              persist(selected);
            }}
          >
            <h2>{originalId ? `Aula ${originalId}` : "Nueva aula"}</h2>
            <fieldset
              disabled={busy || role === "Docente" || selected.state === "Baja"}
            >
              <div className="form-grid">
                <label>
                  Identificador
                  <input
                    id="room-id"
                    aria-label="Identificador"
                    aria-invalid={
                      error.includes("identificador debe ser único") ||
                      undefined
                    }
                    aria-describedby={
                      error.includes("identificador debe ser único")
                        ? "room-id-error"
                        : undefined
                    }
                    required
                    readOnly={!!originalId}
                    value={selected.id}
                    onChange={(e) => patch({ id: e.target.value })}
                  />
                  <FieldError
                    id="room-id-error"
                    message={
                      error.includes("identificador debe ser único")
                        ? error
                        : ""
                    }
                  />
                </label>
                <label>
                  Tipo de aula
                  <select
                    aria-label="Tipo de aula"
                    value={selected.type}
                    onChange={(e) =>
                      patch({
                        type: e.target.value,
                        resources: (selected.resources ?? []).filter((r) =>
                          resourcesFor(e.target.value).includes(r),
                        ),
                        computers:
                          e.target.value === "Laboratorio" ? 0 : undefined,
                      })
                    }
                  >
                    {["General", "Multimedios", "Laboratorio"].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Capacidad (personas)
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={selected.capacity}
                    onChange={(e) =>
                      patch({ capacity: Number(e.target.value) })
                    }
                  />
                </label>
                <label>
                  Ubicación / edificio
                  <input
                    required
                    value={selected.location ?? ""}
                    onChange={(e) => patch({ location: e.target.value })}
                  />
                </label>
                <label>
                  Piso
                  <input
                    type="number"
                    step="1"
                    required
                    value={selected.floor ?? 0}
                    onChange={(e) => patch({ floor: Number(e.target.value) })}
                  />
                </label>
                <label>
                  Estado
                  <select
                    aria-label="Estado del aula"
                    value={selected.state}
                    onChange={(e) =>
                      patch({ state: e.target.value as Room["state"] })
                    }
                  >
                    {["Habilitada", "Inhabilitada", "Mantenimiento"].map(
                      (t) => (
                        <option key={t}>{t}</option>
                      ),
                    )}
                    {selected.state === "Baja" && <option>Baja</option>}
                  </select>
                </label>
                <label>
                  Pizarrón
                  <select
                    aria-label="Pizarrón"
                    value={selected.board}
                    onChange={(e) => patch({ board: e.target.value })}
                  >
                    <option>Fibrón</option>
                    <option>Tiza</option>
                  </select>
                </label>
                {selected.type === "Laboratorio" && (
                  <label>
                    PC (dato descriptivo)
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={selected.computers ?? 0}
                      onChange={(e) =>
                        patch({ computers: Number(e.target.value) })
                      }
                    />
                  </label>
                )}
              </div>
              <fieldset className="header-resources">
                <legend>Recursos disponibles</legend>
                {resourcesFor(selected.type).map((r) => (
                  <label key={r}>
                    <input
                      type="checkbox"
                      checked={selected.resources?.includes(r) ?? false}
                      onChange={(e) =>
                        patch({
                          resources: e.target.checked
                            ? [...(selected.resources ?? []), r]
                            : (selected.resources ?? []).filter((v) => v !== r),
                        })
                      }
                    />
                    {resourceLabels[r]}
                  </label>
                ))}
              </fieldset>
            </fieldset>
            {error && (
              <FormError
                message={error}
                fields={[
                  ...(error.includes("identificador debe ser único")
                    ? [{ id: "room-id", label: "identificador" }]
                    : []),
                ]}
              />
            )}
            {selected.history && (
              <details>
                <summary>Historial de estado y tipo</summary>
                {selected.history.map((h, i) => (
                  <p key={i}>
                    {h.at.replace("T", " ")} · {h.state} · {h.type}
                  </p>
                ))}
              </details>
            )}
            <div className="change-room-actions">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelected(undefined)}
              >
                Descartar
              </Button>
              {role !== "Docente" && selected.state !== "Baja" && (
                <>
                  <Button type="submit">Guardar aula</Button>
                  {originalId && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setConfirmDelete(true)}
                    >
                      Dar de baja
                    </Button>
                  )}
                </>
              )}
            </div>
            {confirmDelete && (
              <div className="cancellation-warning">
                <p>
                  Dar de baja Aula {originalId} retira el espacio de la
                  operación habitual. No se puede restaurar ni reutilizar el
                  identificador.
                </p>
                <Button
                  type="button"
                  className="cancel-confirm"
                  onClick={() => {
                    const current = selected;
                    if (current)
                      persist({
                        ...current,
                        version: selected.version,
                        state: "Baja",
                      });
                  }}
                >
                  Confirmar baja
                </Button>
              </div>
            )}
          </form>
        )}
      </div>
    </>
  );
}
