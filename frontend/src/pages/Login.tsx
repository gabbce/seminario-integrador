import { useState, type FormEvent } from "react";
import { Eye, EyeOff, ArrowRight } from "lucide-react";

import { Brand } from "../components/Brand";
import { Button } from "../components/ui/button";

export function Login({
  onLogin,
  notice,
}: {
  notice?: string;
  onLogin: (email: string, password: string) => string | undefined;
}) {
  const [error, setError] = useState("");
  const [show, setShow] = useState(false);
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const failure = onLogin(
      String(data.get("email")),
      String(data.get("password")),
    );
    if (failure) setError(failure);
  }
  return (
    <div className="login-page">
      <Brand />
      <form className="login-panel" onSubmit={submit}>
        <p className="eyebrow">GESTIÓN ACADÉMICA</p>
        <h1>Ingresar</h1>
        {notice && <p role="alert">{notice}</p>}
        <p className="muted">Tu espacio para organizar los espacios.</p>
        <label>
          Correo electrónico
          <input name="email" type="email" autoComplete="username" required />
        </label>
        <label>
          Contraseña
          <div className="password">
            <input
              name="password"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
              onClick={() => setShow(!show)}
            >
              {show ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <Button type="submit">
          Ingresar <ArrowRight />
        </Button>
        <p className="help">
          Si necesitás ayuda para ingresar, contactá al administrador.
        </p>
      </form>
      <aside className="demo-note">
        Acceso de demostración: bedel@demo.local · Aulas2026
        <br />
        También disponibles: admin@demo.local y docente@demo.local.
      </aside>
    </div>
  );
}
