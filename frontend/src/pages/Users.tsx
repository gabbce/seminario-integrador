import { FormError, FieldError } from "../components/FormError";
import { AdminNav } from "../components/AdminNav";
import { useState } from "react";
import type { User } from "../users";
import { Button } from "../components/ui/button";
export function Users({
  users,
  save,
  reset,
}: {
  users: User[];
  save: (u: User, password: string, confirmation: string) => string | undefined;
  reset: (
    id: string,
    password: string,
    confirmation: string,
  ) => string | undefined;
}) {
  const [selected, setSelected] = useState<User>();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState("name");
  const filtered = users
    .filter(
      (u) =>
        `${u.name} ${u.surname} ${u.email}`
          .toLowerCase()
          .includes(query.toLowerCase()) &&
        (!role || u.role === role) &&
        (!status || u.active === (status === "active")),
    )
    .sort((a, b) =>
      sort === "email"
        ? a.email.localeCompare(b.email)
        : `${a.surname} ${a.name}`.localeCompare(`${b.surname} ${b.name}`),
    );
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages);
  function edit(user?: User) {
    setSelected(
      user ?? {
        id: crypto.randomUUID(),
        version: 0,
        name: "",
        surname: "",
        email: "",
        role: "Bedel",
        active: true,
      },
    );
    setPassword("");
    setConfirmation("");
    setResetting(false);
    setError("");
    setMessage("");
  }
  const creating = selected && !users.some((u) => u.id === selected.id);
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
            {filtered
              .slice((current - 1) * pageSize, current * pageSize)
              .map((u) => (
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
                      users.filter(
                        (x) => x.active && x.role === "Administrador",
                      ).length === 1 && (
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
          {!filtered.length && <p>No hay cuentas coincidentes.</p>}
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
            onSubmit={(e) => {
              e.preventDefault();
              const failure = resetting
                ? reset(selected.id, password, confirmation)
                : save(selected, password, confirmation);
              if (failure) {
                setError(failure);
                return;
              }
              setSelected(undefined);
              setPassword("");
              setConfirmation("");
              setMessage(
                resetting
                  ? "Contraseña actualizada. Comunicala al titular fuera de la app."
                  : "Cuenta guardada.",
              );
            }}
          >
            <h2>
              {resetting
                ? "Establecer contraseña"
                : creating
                  ? "Nueva cuenta"
                  : "Editar cuenta"}
            </h2>
            {!resetting && (
              <div className="form-grid">
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
                      setSelected({ ...selected, surname: e.target.value })
                    }
                  />
                </label>
                <label>
                  Correo de acceso
                  <input
                    id="account-email"
                    aria-label="Correo de acceso"
                    aria-invalid={
                      error.includes("correo ya pertenece") || undefined
                    }
                    aria-describedby={
                      error.includes("correo ya pertenece")
                        ? "account-email-error"
                        : undefined
                    }
                    required
                    type="email"
                    value={selected.email}
                    onChange={(e) =>
                      setSelected({ ...selected, email: e.target.value })
                    }
                  />
                  <FieldError
                    id="account-email-error"
                    message={error.includes("correo ya pertenece") ? error : ""}
                  />
                </label>
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
                        setSelected({ ...selected, shift: e.target.value })
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
                        setSelected({ ...selected, staffId: e.target.value })
                      }
                    />
                  </label>
                )}
              </div>
            )}
            {(creating || resetting) && (
              <>
                <p>{selected.email} · La contraseña anterior no se consulta.</p>
                <label>
                  Nueva contraseña
                  <input
                    type="password"
                    autoComplete="new-password"
                    minLength={6}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>
                <label>
                  Confirmar contraseña
                  <input
                    id="account-confirmation"
                    aria-label="Confirmar contraseña"
                    aria-invalid={
                      error.includes("contraseñas no coinciden") || undefined
                    }
                    aria-describedby={
                      error.includes("contraseñas no coinciden")
                        ? "account-confirmation-error"
                        : undefined
                    }
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                  />
                  <FieldError
                    id="account-confirmation-error"
                    message={
                      error.includes("contraseñas no coinciden") ? error : ""
                    }
                  />
                </label>
              </>
            )}
            {error && (
              <FormError
                message={error}
                fields={[
                  ...(error.includes("correo ya pertenece")
                    ? [{ id: "account-email", label: "correo" }]
                    : []),
                  ...(error.includes("contraseñas no coinciden")
                    ? [
                        {
                          id: "account-confirmation",
                          label: "confirmación de contraseña",
                        },
                      ]
                    : []),
                ]}
              />
            )}
            <div className="change-room-actions">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelected(undefined)}
              >
                Descartar
              </Button>
              <Button type="submit">
                {resetting ? "Guardar contraseña" : "Guardar cuenta"}
              </Button>
              {!creating && !resetting && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setResetting(true);
                    setError("");
                  }}
                >
                  Establecer contraseña
                </Button>
              )}
            </div>
          </form>
        )}
      </div>
    </>
  );
}
