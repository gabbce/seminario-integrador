import { FormError } from "../components/FormError";
import { AdminNav } from "../components/AdminNav";
import { useState } from "react";
import type { User } from "../users";
import { Button } from "../components/ui/button";
import { useEffect } from "react";
import { api, ApiError } from "../api";
/** Supabase Auth minimum (supabase/config.toml · minimum_password_length). */
const MIN_PASSWORD = 6;
type AccountPage = {
  items: User[];
  total: number;
  page: number;
  size: number;
  activeAdmins: number;
};
type IdentityOperation = {
  operationId: string;
  type: string;
  state: string;
  recoverable: boolean;
};
type IdentityWarning = IdentityOperation & { at: string; message: string };
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
  const [identityOperations, setIdentityOperations] = useState<
    IdentityOperation[]
  >([]);
  const [identityWarnings, setIdentityWarnings] = useState<IdentityWarning[]>(
    [],
  );
  const [identityError, setIdentityError] = useState("");
  const [identityLoading, setIdentityLoading] = useState(false);
  const [identityRevision, setIdentityRevision] = useState(0);
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
    if (!selected?.id) return;
    let active = true;
    api<{ operations: IdentityOperation[]; warnings?: IdentityWarning[] }>(
      `/administracion/cuentas/${selected.id}/operaciones-identidad`,
    )
      .then((result) => {
        if (active) {
          setIdentityOperations(result.operations ?? []);
          setIdentityWarnings(result.warnings ?? []);
          setIdentityError("");
        }
      })
      .catch((e) => {
        if (active) setIdentityError(e.message);
      })
      .finally(() => {
        if (active) setIdentityLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selected?.id, identityRevision]);
  async function recoverIdentity(operation: IdentityOperation) {
    if (!selected || busy) return;
    setBusy(true);
    setIdentityError("");
    try {
      const user = await api<User>(
        `/administracion/cuentas/${selected.id}/operaciones-identidad/${operation.operationId}/recuperar`,
        { method: "POST" },
      );
      setSelected(user);
      setRecovering(false);
      setPassword("");
      setConfirmation("");
      setMode("edit");
      setError("");
      setRevision((value) => value + 1);
      setIdentityRevision((value) => value + 1);
      setMessage("Operación de identidad recuperada.");
      window.dispatchEvent(new Event("aulas-profile-refresh"));
    } catch (e) {
      setIdentityError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
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
      if (
        (mode === "create" || mode === "password") &&
        password.length < MIN_PASSWORD
      )
        return `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres (política de Supabase).`;
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
        (mode === "email" || mode === "password") &&
        (!(e instanceof ApiError) || e.code !== "PASSWORD_UNCERTAIN") &&
        (!(e instanceof ApiError) ||
          e.status >= 500 ||
          e.status === 401 ||
          ["IDENTITY_INCOMPLETE", "AUDIT_INCOMPLETE"].includes(e.code ?? ""))
      ) {
        setRecovering(true);
        setIdentityRevision((value) => value + 1);
      }
      // A rejected operation is closed (a taken e-mail answers 409): the next attempt needs a new UUID.
      if (
        e instanceof ApiError &&
        ((e.status === 400 && mode !== "create") ||
          e.status === 409 ||
          e.code === "PASSWORD_UNCERTAIN")
      )
        setOperationId(crypto.randomUUID());
      if (e instanceof ApiError && e.code === "PASSWORD_UNCERTAIN") {
        // The provider result is unknown but the backend closed this UUID as rejected.
        // A subsequent explicit submission is a new password change, never a replay.
        setRecovering(false);
        setPassword("");
        setConfirmation("");
      }
      return e instanceof Error ? e.message : "No se pudo guardar.";
    }
  }
  function edit(user?: User) {
    setIdentityLoading(!!user?.id);
    setIdentityRevision((value) => value + 1);
    setRecovering(false);
    setIdentityOperations([]);
    setIdentityWarnings([]);
    setIdentityError("");
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
      <section
        className="panel filter-panel"
        aria-labelledby="account-filters-title"
      >
        <div className="filter-panel-head">
          <h2 id="account-filters-title">Filtros</h2>
          <Button
            variant="outline"
            disabled={!query && !role && !status}
            onClick={() => {
              setQuery("");
              setRole("");
              setStatus("");
              setPage(1);
            }}
          >
            Limpiar filtros
          </Button>
        </div>
        <div className="form-grid filter-grid">
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
        </div>
      </section>
      <div className={selected ? "cancellation-layout inventory-layout" : ""}>
        <section
          className="panel results-panel"
          aria-labelledby="account-results-title"
        >
          <div className="results-head">
            <h2 id="account-results-title">
              Cuentas encontradas{data ? ` · ${data.total}` : ""}
            </h2>
            <div className="results-sort">
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
            {selected.id && (
              <section aria-label="Recuperación de identidad">
                {identityWarnings.map((warning) => (
                  <p role="status" key={warning.operationId}>
                    {warning.message} · Operación {warning.operationId} ·{" "}
                    {warning.at}
                  </p>
                ))}
                {identityLoading && (
                  <p role="status">Consultando operaciones de identidad…</p>
                )}
                {identityError && <p role="alert">{identityError}</p>}
                {(identityError || recovering) && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      setIdentityLoading(true);
                      setIdentityRevision((value) => value + 1);
                    }}
                  >
                    Consultar operaciones pendientes
                  </Button>
                )}
                {recovering &&
                  !identityLoading &&
                  !identityError &&
                  !identityOperations.length && (
                    <Button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        const failure = await save(selected);
                        setBusy(false);
                        if (failure) setError(failure);
                        else {
                          setSelected(undefined);
                          setPassword("");
                          setConfirmation("");
                          setMessage("Operación de identidad recuperada.");
                        }
                      }}
                    >
                      Reintentar misma operación
                    </Button>
                  )}
                {identityOperations.map((operation) => (
                  <div key={operation.operationId}>
                    <p>
                      {operation.type === "EMAIL"
                        ? "Cambio de correo"
                        : "Cambio de contraseña"}{" "}
                      pendiente · {operation.state} · {operation.operationId}
                    </p>
                    {operation.recoverable ? (
                      <Button
                        type="button"
                        disabled={busy}
                        onClick={() => void recoverIdentity(operation)}
                      >
                        Recuperar operación pendiente
                      </Button>
                    ) : (
                      <p>
                        El resultado del proveedor requiere comprobación manual
                        antes de realizar otro cambio. Conservá esta identidad
                        de operación.
                      </p>
                    )}
                  </div>
                ))}
              </section>
            )}
            <fieldset
              disabled={
                busy ||
                recovering ||
                identityLoading ||
                !!identityError ||
                identityOperations.length > 0
              }
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
                      minLength={MIN_PASSWORD}
                      aria-describedby="password-policy"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </label>
                  <small id="password-policy" className="field-hint">
                    Mínimo {MIN_PASSWORD} caracteres.
                  </small>
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
              <Button
                type="submit"
                disabled={
                  busy ||
                  recovering ||
                  identityLoading ||
                  !!identityError ||
                  identityOperations.length > 0
                }
              >
                {mode === "password"
                  ? "Guardar contraseña"
                  : mode === "email"
                    ? "Guardar correo"
                    : "Guardar cuenta"}
              </Button>{" "}
              {mode === "edit" &&
                !recovering &&
                !identityLoading &&
                !identityError &&
                !identityOperations.length && (
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
