import { changeHeader } from "./booking-header";
import { reschedule } from "./reschedule";
import { changeRoom } from "./room-change";
import { cancelClasses } from "./cancellation";
import { type ReservationDraft } from "./reservation-draft";
import { initialCourses } from "./catalog";
import { useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Navigate,
} from "react-router-dom";
import {
  CalendarDays,
  Grid2X2,
  BookOpen,
  DoorOpen,
  ChartNoAxesColumn,
  Menu,
  LogOut,
} from "lucide-react";
import { Button } from "./components/ui/button";
import { Brand } from "./components/Brand";
import { initialBookings, type Role } from "./domain";
import "./App.css";
import { Login } from "./pages/Login";
import { Agenda } from "./pages/Agenda";
import { Wizard } from "./pages/Wizard";
import { Listing } from "./pages/Listing";
import { Detail } from "./pages/Detail";
import { Rooms } from "./pages/Rooms";
import { Pending } from "./pages/Pending";

const navigation = [
  ["/agenda", "Agenda", CalendarDays],
  ["/disponibilidad", "Disponibilidad", Grid2X2],
  ["/reservas", "Reservas", BookOpen],
  ["/aulas", "Aulas", DoorOpen],
  ["/indicadores", "Indicadores", ChartNoAxesColumn],
] as const;
function App() {
  const [role, setRole] = useState<Role | null>(null);
  const [bookings, setBookings] = useState(initialBookings);
  const [courses, setCourses] = useState(initialCourses);
  const [draft, setDraft] = useState<ReservationDraft>();
  const [menu, setMenu] = useState(false);
  return (
    <BrowserRouter>
      {!role ? (
        <Login onLogin={setRole} />
      ) : (
        <>
          <header className="topbar">
            <Brand />
            <button
              className="mobile-menu"
              onClick={() => setMenu(!menu)}
              aria-expanded={menu}
            >
              <Menu size={20} /> Menú
            </button>
            <nav
              className={menu ? "open" : ""}
              aria-label="Navegación principal"
            >
              {navigation
                .filter((n) => role !== "Docente" || n[0] !== "/indicadores")
                .map(([path, label, Icon]) => (
                  <NavLink key={path} to={path} onClick={() => setMenu(false)}>
                    <Icon size={20} />
                    {label}
                  </NavLink>
                ))}
              {role === "Administrador" && (
                <NavLink to="/administracion" onClick={() => setMenu(false)}>
                  Administración
                </NavLink>
              )}
            </nav>
            <div className="account">
              <span>Demo · {role}</span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Cerrar sesión"
                onClick={() => setRole(null)}
              >
                <LogOut />
              </Button>
            </div>
          </header>
          <main>
            <Routes>
              <Route
                path="/agenda"
                element={
                  <Agenda bookings={bookings} operator={role !== "Docente"} />
                }
              />
              <Route
                path="/reservas/nueva"
                element={
                  role === "Docente" ? (
                    <Navigate to="/agenda" />
                  ) : (
                    <Wizard
                      key="register"
                      initial={draft}
                      onConsume={() => setDraft(undefined)}
                      courses={courses}
                      addCourse={(course) =>
                        setCourses((old) =>
                          old.some((c) => c.id === course.id)
                            ? old
                            : [...old, course],
                        )
                      }
                      role={role}
                      bookings={bookings}
                      save={(b) => setBookings((old) => [...old, b])}
                    />
                  )
                }
              />
              <Route
                path="/reservas/:id"
                element={
                  <Detail
                    bookings={bookings}
                    role={role}
                    courses={courses}
                    addCourse={(course) =>
                      setCourses((old) =>
                        old.some((c) => c.id === course.id)
                          ? old
                          : [...old, course],
                      )
                    }
                    changeHeader={(id, request) => {
                      const current = bookings.find((b) => b.id === id);
                      if (!current) return "Reserva no encontrada.";
                      const result = changeHeader(
                        current,
                        request,
                        courses,
                        role,
                      );
                      if (result.error) return result.error;
                      if (result.booking)
                        setBookings((old) =>
                          old.map((b) => (b.id === id ? result.booking : b)),
                        );
                    }}
                    reschedule={(id, request) => {
                      const current = bookings.find((b) => b.id === id);
                      if (!current) return "Reserva no encontrada.";
                      const result = reschedule(
                        current,
                        request,
                        bookings,
                        role,
                      );
                      if (result.error) return result.error;
                      if (result.booking)
                        setBookings((old) =>
                          old.map((b) => (b.id === id ? result.booking : b)),
                        );
                    }}
                    changeRoom={(id, request) => {
                      const current = bookings.find((b) => b.id === id);
                      if (!current) return "Reserva no encontrada.";
                      const result = changeRoom(
                        current,
                        request,
                        bookings,
                        role,
                      );
                      if (result.error) return result.error;
                      if (result.booking)
                        setBookings((old) =>
                          old.map((b) => (b.id === id ? result.booking : b)),
                        );
                    }}
                    cancel={(id, request) => {
                      const current = bookings.find((b) => b.id === id);
                      if (!current) return "La reserva ya no está disponible.";
                      const result = cancelClasses(current, request, role);
                      if (result.error) return result.error;
                      if (result.booking)
                        setBookings((old) =>
                          old.map((b) => (b.id === id ? result.booking : b)),
                        );
                    }}
                  />
                }
              />
              <Route
                path="/reservas"
                element={<Listing bookings={bookings} />}
              />
              <Route path="/aulas" element={<Rooms />} />
              <Route
                path="/disponibilidad"
                element={
                  <Wizard
                    key="query"
                    queryOnly
                    role={role}
                    bookings={bookings}
                    courses={courses}
                    addCourse={() => {}}
                    save={() => {}}
                    onPrepare={setDraft}
                  />
                }
              />
              {["indicadores", "administracion"].map((path) => (
                <Route
                  key={path}
                  path={`/${path}`}
                  element={<Pending name={path} />}
                />
              ))}
              <Route path="*" element={<Navigate to="/agenda" replace />} />
            </Routes>
          </main>
          <footer>
            Demostración académica · Datos ficticios · Los cambios se reinician
            al recargar
          </footer>
        </>
      )}
    </BrowserRouter>
  );
}
export default App;
