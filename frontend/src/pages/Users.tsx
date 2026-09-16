import { FormError } from "../components/FormError";
import { AdminNav } from "../components/AdminNav";
import { useState } from "react";
import type { User } from "../users";
import { Button } from "../components/ui/button";
import { useEffect } from "react";
import { api, ApiError } from "../api";
type AccountPage = {
  items: User[];
  total: number;
  page: number;
  size: number;
  activeAdmins: number;
};
export function Users() {
  const [data, setData] = useState<AccountPage>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [revision, setRevision] = useState(0);
  const [mode, setMode] = useState<"edit" | "create" | "email" | "password">(
    "edit",
  );
  const [operationId, setOperationId] = useState(() => crypto.randomUUID());
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [recovering, setRecovering] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<User>();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState("name");
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    api<AccountPage>(
      `/administracion/cuentas?${new URLSearchParams({ query, role, status, sort, page: String(page), size: String(pageSize) })}`,
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
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [query, role, status, sort, page, pageSize, revision]);
  const users = data?.items ?? [];
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));
  const current = data?.page ?? page;
  async function save(user: User): Promise<string | undefined> {
    try {
      if (
        (mode === "create" || mode === "password") &&
        password !== confirmation
      )
        return "Las contraseñas no coinciden.";
      const path =
        mode === "create"
          ? "/administracion/cuentas"
          : `/administracion/cuentas/${user.id}${mode === "email" ? "/email" : mode === "password" ? "/password" : ""}`;
      const body =
        mode === "password"
          ? { operationId, version: user.version, password, confirmation }
          : mode === "email"
            ? { operationId, version: user.version, email: user.email }
            : mode === "create"
              ? { ...user, operationId, password, confirmation }
              : user;
      await api(path, {
        method: mode === "create" ? "POST" : "PUT",
        body: JSON.stringify(body),
      });
      setRevision((r) => r + 1);
      window.dispatchEvent(new Event("aulas-profile-refresh"));
    } catch (e) {
      if (
        e instanceof ApiError &&
        ["IDENTITY_INCOMPLETE", "AUDIT_INCOMPLETE"].includes(e.code ?? "")
      )
        setRecovering(true);
      if (
        e instanceof ApiError &&
        ((e.status === 400 && mode !== "create") ||
          (e.status === 409 && mode === "create") ||
          e.code === "PASSWORD_UNCERTAIN")
      )
        setOperationId(crypto.randomUUID());
      return e instanceof Error ? e.message : "No se pudo guardar.";
    }
  }
  function edit(user?: User) {
    setRecovering(false);
    setMode(user ? "edit" : "create");
    setOperationId(crypto.randomUUID());
    setPassword("");
    setConfirmation("");
    setSelected(
      user ?? {
        id: "",
        version: 0,
        name: "",
        surname: "",
        email: "",
        role: "Bedel",
        active: true,
      },
    );
    setError("");
    setMessage("");
  }
  return (
    <>
      <AdminNav />
      <div className="page-heading">
        <div>
          <p className="eyebrow">Administración</p>
          <h1>Cuentas de acceso</h1>
          <p>Roles y acceso al sistema</p>
        </div>
        <Button onClick={() => edit()}>Nueva cuenta</Button>
      </div>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      <div className={selected ? "cancellation-layout inventory-layout" : ""}>
        <section className="panel">
          <div className="form-grid">
            <label>
              Buscar nombre o correo
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
            </label>
            <label>
              Rol
              <select
                aria-label="Filtrar rol"
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Todos</option>
                {["Administrador", "Bedel", "Docente"].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            <label>
              Estado
              <select
                aria-label="Filtrar estado de cuenta"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Todos</option>
                <option value="active">Activas</option>
                <option value="inactive">Deshabilitadas</option>
              </select>
            </label>
            <label>
              Ordenar
              <select
                aria-label="Ordenar cuentas"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="name">Apellido y nombre</option>
                <option value="email">Correo</option>
              </select>
            </label>
          </div>
          <div className="inventory-list">
            {(!loadError ? users : []).map((u) => (
              <article key={u.id}>
                <div>
                  <strong>
                    {u.name} {u.surname}
                  </strong>
                  <p>{u.email}</p>
                  <small>
                    {u.role} · {u.active ? "Activa" : "Deshabilitada"}
                  </small>
                  {u.active &&
                    u.role === "Administrador" &&
                    data?.activeAdmins === 1 && (
                      <p className="eyebrow">Último administrador activo</p>
                    )}
                </div>
                <Button
                  variant="outline"
                  aria-label={`Editar ${u.email}`}
                  onClick={() => edit(u)}
                >
                  Editar
                </Button>
              </article>
            ))}
          </div>
          {loading && <p role="status">Cargando cuentas…</p>}
          {loadError && (
            <div role="alert">
              {loadError}
              <Button onClick={() => setRevision((r) => r + 1)}>
                Reintentar
              </Button>
            </div>
          )}
          {!loading && !loadError && !users.length && (
            <p>No hay cuentas coincidentes.</p>
          )}
          <div className="pagination">
            <label>
              Cuentas por página
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
            <Button
              variant="outline"
              disabled={current === 1}
              onClick={() => setPage(current - 1)}
            >
              Anterior
            </Button>
            <span>
              Página {current} de {pages}
            </span>
            <Button
              variant="outline"
              disabled={current === pages}
              onClick={() => setPage(current + 1)}
            >
              Siguiente
            </Button>
          </div>
        </section>
        {selected && (
          <form
            className="panel"
            onSubmit={async (e) => {
              e.preventDefault();
              if (busy) return;
              setBusy(true);
              const failure = await save(selected);
              setBusy(false);
              if (failure) {
                setError(failure);
                return;
              }
              setSelected(undefined);
              setPassword("");
              setConfirmation("");
              setMessage(
                mode === "password"
                  ? "Contraseña actualizada. Comunicala al titular fuera de la app."
                  : "Cuenta guardada.",
              );
            }}
          >
            <h2>
              {mode === "create"
                ? "Nueva cuenta"
                : mode === "password"
                  ? "Establecer contraseña"
                  : mode === "email"
                    ? "Cambiar correo"
                    : "Editar cuenta"}
            </h2>
            <fieldset
              disabled={busy || recovering}
              style={{ border: 0, padding: 0, margin: 0 }}
            >
              {mode !== "password" && (
                <div className="form-grid">
                  {mode !== "email" && (
                    <>
                      {" "}
                      <label>
                        Nombre
                        <input
                          required
                          value={selected.name}
                          onChange={(e) =>
                            setSelected({ ...selected, name: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        Apellido
                        <input
                          required
                          value={selected.surname}
                          onChange={(e) =>
                            setSelected({
                              ...selected,
                              surname: e.target.value,
                            })
                          }
                        />
                      </label>
                    </>
                  )}
                  <label>
                    Correo de acceso
                    <input
                      readOnly={mode === "edit"}
                      id="account-email"
                      aria-label="Correo de acceso"
                      required
                      type="email"
                      value={selected.email}
                      onChange={(e) =>
                        setSelected({ ...selected, email: e.target.value })
                      }
                    />
                  </label>
                  {mode !== "email" && (
                    <>
                      {" "}
                      <label>
                        Rol
                        <select
                          aria-label="Rol de cuenta"
                          value={selected.role}
                          onChange={(e) =>
                            setSelected({
                              ...selected,
                              role: e.target.value as User["role"],
                            })
                          }
                        >
                          {["Administrador", "Bedel", "Docente"].map((r) => (
                            <option key={r}>{r}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Estado
                        <select
                          aria-label="Estado de cuenta"
                          value={selected.active ? "active" : "inactive"}
                          onChange={(e) =>
                            setSelected({
                              ...selected,
                              active: e.target.value === "active",
                            })
                          }
                        >
                          <option value="active">Activa</option>
                          <option value="inactive">Deshabilitada</option>
                        </select>
                      </label>
                      {selected.role === "Bedel" && (
                        <label>
                          Turno (opcional)
                          <input
                            value={selected.shift ?? ""}
                            onChange={(e) =>
                              setSelected({
                                ...selected,
                                shift: e.target.value,
                              })
                            }
                          />
                        </label>
                      )}
                      {selected.role === "Docente" && (
                        <label>
                          Legajo (opcional)
                          <input
                            value={selected.staffId ?? ""}
                            onChange={(e) =>
                              setSelected({
                                ...selected,
                                staffId: e.target.value,
                              })
                            }
                          />
                        </label>
                      )}
                    </>
                  )}
                </div>
              )}
              {(mode === "create" || mode === "password") && (
                <>
                  <label>
                    Nueva contraseña
                    <input
                      required
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </label>
                  <label>
                    Confirmar contraseña
                    <input
                      required
                      type="password"
                      autoComplete="new-password"
                      value={confirmation}
                      onChange={(e) => setConfirmation(e.target.value)}
                    />
                  </label>
                </>
              )}
              {error && <FormError message={error} />}
            </fieldset>
            <div className="change-room-actions">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelected(undefined)}
              >
                Descartar
              </Button>
              <Button type="submit" disabled={busy}>
                {mode === "password"
                  ? "Guardar contraseña"
                  : mode === "email"
                    ? "Guardar correo"
                    : "Guardar cuenta"}
              </Button>{" "}
              {mode === "edit" && !recovering && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setMode("email");
                      setOperationId(crypto.randomUUID());
                      setError("");
                    }}
                  >
                    Cambiar correo
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setMode("password");
                      setOperationId(crypto.randomUUID());
                      setError("");
                    }}
                  >
                    Establecer contraseña
                  </Button>
                </>
              )}
            </div>
          </form>
        )}
      </div>
    </>
  );
}
