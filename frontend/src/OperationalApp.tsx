import { institutionalNow } from "./institutional-time";
import { isDate } from "./date-input";
import type { CalendarConfig } from "./calendar";
import { PersistedDetail } from "./pages/PersistedDetail";
import { CalendarContext } from "./calendar-context";

import PersistedCalendar from "./pages/PersistedCalendar";
import { Users } from "./pages/Users";
import { api } from "./api";
import { RoomContext } from "./room-context";

import { type ReservationDraft } from "./reservation-draft";
import type { Course } from "./catalog";
import type { TeacherReference } from "./teachers";
import { TeacherContext } from "./teacher-context";

import { useState, useEffect } from "react";
import {
  Routes,
  Route,
  NavLink,
  Navigate,
  useLocation,
  useNavigate,
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
import { type Room } from "./domain";
import "./App.css";
import type { Profile } from "./auth-client";
import { Agenda } from "./pages/Agenda";
import { Wizard } from "./pages/Wizard";
import { PersistedListing } from "./pages/PersistedListing";
import { Rooms } from "./pages/Rooms";
import { PersistedIndicators } from "./pages/PersistedIndicators";

const navigation = [
  ["/agenda", "Agenda", CalendarDays],
  ["/disponibilidad", "Disponibilidad", Grid2X2],
  ["/reservas", "Reservas", BookOpen],
  ["/aulas", "Aulas", DoorOpen],
  ["/indicadores", "Indicadores", ChartNoAxesColumn],
] as const;
export default function App({
  currentUser,
  onLogout,
}: {
  currentUser: Profile;
  onLogout: () => void;
}) {
  const [calendars, setCalendars] = useState<CalendarConfig[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarError, setCalendarError] = useState("");
  useEffect(() => {
    let active = true;
    const load = () => {
      void api<CalendarConfig[]>("/referencias/calendarios")
        .then((rows) => {
          if (active) {
            setCalendars(rows);
            setCalendarError("");
          }
        })
        .catch((e) => {
          if (active) setCalendarError(e.message);
        })
        .finally(() => {
          if (active) setCalendarLoading(false);
        });
    };
    load();
    window.addEventListener("aulas-calendar-refresh", load);
    return () => {
      active = false;
      window.removeEventListener("aulas-calendar-refresh", load);
    };
  }, []);
  const location = useLocation();
  const queryDate = new URLSearchParams(location.search).get("fecha");
  const requestedDate = queryDate && isDate(queryDate) ? queryDate : null;
  const [agendaSelection, setAgendaSelection] = useState({
    locationKey: location.key,
    date: requestedDate ?? institutionalNow().slice(0, 10),
  });
  const agendaDate =
    agendaSelection.locationKey === location.key
      ? agendaSelection.date
      : (requestedDate ?? agendaSelection.date);
  const navigate = useNavigate();
  const setAgendaDate = (date: string) => {
    setAgendaSelection({ locationKey: location.key, date });
    const params = new URLSearchParams(location.search);
    params.set("fecha", date);
    navigate(
      { pathname: "/agenda", search: params.toString() },
      { replace: true },
    );
  };
  const [inventory, setInventory] = useState<Room[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState("");
  useEffect(() => {
    let active = true;
    const load = () => {
      void api<Room[]>("/referencias/aulas")
        .then((rooms) => {
          if (active) {
            setInventory(rooms);
            setInventoryError("");
          }
        })
        .catch((e) => {
          if (active) setInventoryError(e.message);
        })
        .finally(() => {
          if (active) setInventoryLoading(false);
        });
    };
    load();
    window.addEventListener("aulas-inventory-refresh", load);
    return () => {
      active = false;
      window.removeEventListener("aulas-inventory-refresh", load);
    };
  }, []);
  const role = currentUser?.role;
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<TeacherReference[]>([]);
  const [referencesLoading, setReferencesLoading] = useState(true);
  const [referencesError, setReferencesError] = useState("");
  const referenceYears = calendars
    .map((calendar) => calendar.year)
    .sort((a, b) => a - b)
    .join(",");
  useEffect(() => {
    let active = true;
    const load = () => {
      setReferencesLoading(true);
      void Promise.all([
        Promise.all(
          referenceYears
            .split(",")
            .filter(Boolean)
            .map((year) => api<Course[]>(`/referencias/cursos?year=${year}`)),
        ).then((rows) => rows.flat()),
        api<TeacherReference[]>("/referencias/docentes"),
      ])
        .then(([items, people]) => {
          if (active) {
            setCourses(items);
            setTeachers(people);
            setReferencesError("");
          }
        })
        .catch((e) => {
          if (active) setReferencesError(e.message);
        })
        .finally(() => {
          if (active) setReferencesLoading(false);
        });
    };
    load();
    window.addEventListener("aulas-references-refresh", load);
    return () => {
      active = false;
      window.removeEventListener("aulas-references-refresh", load);
    };
  }, [referenceYears]);
  const [draft, setDraft] = useState<ReservationDraft>();
  const [menu, setMenu] = useState(false);

  return (
    <TeacherContext value={teachers}>
      <CalendarContext value={calendars}>
        <RoomContext value={inventory}>
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
                  .filter(
                    (n) =>
                      n[0] !== "/indicadores" ||
                      currentUser.permissions.includes("indicadores:read"),
                  )
                  .map(([path, label, Icon]) => (
                    <NavLink
                      key={path}
                      to={path}
                      onClick={() => setMenu(false)}
                    >
                      <Icon size={20} />
                      {label}
                    </NavLink>
                  ))}
                {currentUser.permissions.includes("cuentas:write") && (
                  <NavLink to="/administracion" onClick={() => setMenu(false)}>
                    Administración
                  </NavLink>
                )}
              </nav>
              <div className="account">
                <span>
                  {currentUser.name} · {role}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Cerrar sesión"
                  onClick={onLogout}
                >
                  <LogOut />
                </Button>
              </div>
            </header>
            <main>
              {location.pathname === "/agenda" &&
                queryDate !== null &&
                !isDate(queryDate) && (
                  <p role="alert">
                    La fecha de agenda no es válida. Seleccioná una fecha
                    existente.
                  </p>
                )}
              {inventoryError && (
                <div role="alert">
                  {inventoryError}
                  <Button
                    onClick={() =>
                      window.dispatchEvent(new Event("aulas-inventory-refresh"))
                    }
                  >
                    Reintentar aulas
                  </Button>
                </div>
              )}
              {referencesError && (
                <p role="alert">
                  {referencesError}{" "}
                  <Button
                    onClick={() =>
                      window.dispatchEvent(
                        new Event("aulas-references-refresh"),
                      )
                    }
                  >
                    Reintentar referencias
                  </Button>
                </p>
              )}
              {calendarError && (
                <p role="alert">
                  {calendarError}{" "}
                  <Button
                    onClick={() =>
                      window.dispatchEvent(new Event("aulas-calendar-refresh"))
                    }
                  >
                    Reintentar calendario
                  </Button>
                </p>
              )}
              {(inventoryLoading || calendarLoading || referencesLoading) && (
                <p role="status">Cargando datos…</p>
              )}
              {!inventoryError &&
                !inventoryLoading &&
                !calendarError &&
                !calendarLoading &&
                !referencesError &&
                !referencesLoading && (
                  <Routes>
                    <Route
                      path="/agenda"
                      element={
                        <Agenda
                          bookings={[]}
                          persisted
                          courses={courses}
                          date={agendaDate}
                          setDate={setAgendaDate}
                          operator={role !== "Docente"}
                        />
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
                            storageKey={`aulas-confirmation:${currentUser.id}`}
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
                            onConfirmed={() => {}}
                          />
                        )
                      }
                    />
                    <Route
                      path="/reservas/:id"
                      element={
                        <PersistedDetail
                          key={location.pathname}
                          role={role}
                          actorId={currentUser.id}
                          courses={courses}
                          addCourse={(course) =>
                            setCourses((old) => [
                              ...old.filter((c) => c.id !== course.id),
                              course,
                            ])
                          }
                        />
                      }
                    />
                    <Route
                      path="/reservas"
                      element={<PersistedListing courses={courses} />}
                    />
                    <Route path="/aulas" element={<Rooms role={role} />} />
                    <Route
                      path="/disponibilidad"
                      element={
                        <Wizard
                          key="query"
                          queryOnly
                          role={role}
                          courses={courses}
                          addCourse={() => {}}
                          onPrepare={setDraft}
                        />
                      }
                    />
                    <Route
                      path="/indicadores"
                      element={
                        role === "Docente" ? (
                          <Navigate to="/agenda" replace />
                        ) : (
                          <PersistedIndicators />
                        )
                      }
                    />
                    <Route
                      path="/administracion"
                      element={
                        role === "Administrador" ? (
                          <Users />
                        ) : (
                          <Navigate to="/agenda" replace />
                        )
                      }
                    />
                    <Route
                      path="/administracion/calendario"
                      element={
                        role === "Administrador" ? (
                          <PersistedCalendar actorId={currentUser.id} />
                        ) : (
                          <Navigate to="/agenda" replace />
                        )
                      }
                    />
                    <Route
                      path="*"
                      element={<Navigate to="/agenda" replace />}
                    />
                  </Routes>
                )}
            </main>
            <footer>Demostración académica · Datos ficticios</footer>
          </>
        </RoomContext>
      </CalendarContext>
    </TeacherContext>
  );
}
