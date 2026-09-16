import { lazy, Suspense } from "react";
import { BrowserRouter } from "react-router-dom";
import { useSession } from "./use-session";
import { Login } from "./pages/Login";
import { Brand } from "./components/Brand";
import { Button } from "./components/ui/button";
import "./App.css";
const App = lazy(() => import("./OperationalApp"));
export default function IntegratedApp() {
  const session = useSession();
  return (
    <BrowserRouter>
      {session.phase === "loading" ? (
        <div className="login-page">
          <Brand />
          <p role="status">{session.message || "Verificando sesión…"}</p>
        </div>
      ) : session.phase === "error" ? (
        <div className="login-page">
          <Brand />
          <section className="login-panel">
            <h1>No se pudo acceder</h1>
            <p role="alert">{session.message}</p>
            <Button onClick={session.retry}>Reintentar</Button>
            <Button variant="outline" onClick={() => void session.signOut()}>
              Cerrar sesión
            </Button>
          </section>
        </div>
      ) : session.profile ? (
        <Suspense fallback={<p role="status">Cargando…</p>}>
          <App
            key={session.profile.id}
            currentUser={session.profile}
            onLogout={() => void session.signOut()}
          />
        </Suspense>
      ) : (
        <Login onLogin={session.signIn} notice={session.message} />
      )}
    </BrowserRouter>
  );
}
