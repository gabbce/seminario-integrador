import {
  addYear,
  deleteYear,
  bookingYear,
  yearMutationError,
} from "./academic-years";
import { CalendarContext } from "./calendar-context";
import { createScenario, type ScenarioId } from "./demo-scenarios";
import { DemoControls } from "./components/DemoControls";
import { resetDemoCredentials } from "./mock-auth";
import { setDemoNow } from "./calendar";
import { initialCalendar } from "./calendar";
import { changeCalendar } from "./calendar-management";
import { CalendarEditor } from "./pages/CalendarEditor";
import { Users } from "./pages/Users";
import { initialUsers, saveUser, type User } from "./users";
import { authenticate, passwordError, setCredential } from "./mock-auth";
import { saveRoom } from "./room-management";
import { RoomContext } from "./room-context";

import { changeHeader } from "./booking-header";
import { reschedule } from "./reschedule";
import { changeRoom } from "./room-change";
import { cancelClasses } from "./cancellation";
import { type ReservationDraft } from "./reservation-draft";
import { initialCourses } from "./catalog";
import { DemoQueryContext, type DemoQueryFault } from "./demo-query";
import { useState, useEffect } from "react";
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
import { type Booking } from "./domain";
import "./App.css";
import { Login } from "./pages/Login";
import { Agenda } from "./pages/Agenda";
import { Wizard } from "./pages/Wizard";
import { Listing } from "./pages/Listing";
import { Detail } from "./pages/Detail";
import { Rooms } from "./pages/Rooms";
import { Indicators } from "./pages/Indicators";

const navigation = [
  ["/agenda", "Agenda", CalendarDays],
  ["/disponibilidad", "Disponibilidad", Grid2X2],
  ["/reservas", "Reservas", BookOpen],
  ["/aulas", "Aulas", DoorOpen],
  ["/indicadores", "Indicadores", ChartNoAxesColumn],
] as const;
function attributeChange(
  before: Booking,
  after: Booking,
  user: User | undefined,
): Booking {
  if (!user) return after;
  const actor = `${user.name} ${user.surname} · ${user.email}`;
  return {
    ...after,
    changes: after.changes?.map((change, index) =>
      index >= (before.changes?.length ?? 0) ? { ...change, actor } : change,
    ),
    occurrences: after.occurrences.map((o, index) =>
      o.cancellation && !before.occurrences[index]?.cancelled
        ? { ...o, cancellation: { ...o.cancellation, actor } }
        : o,
    ),
  };
}
function App({ scenario }: { scenario: ReturnType<typeof createScenario> }) {
  const [calendars, setCalendars] = useState([scenario.calendar]);
  const [selectedYear, setSelectedYear] = useState(2026);
  const calendar =
    calendars.find((c) => c.year === selectedYear) ??
    calendars[0] ??
    initialCalendar;
  const [inventory, setInventory] = useState(scenario.inventory);
  const [users, setUsers] = useState(initialUsers);
  const [userId, setUserId] = useState<string>();
  const currentUser = users.find((u) => u.id === userId && u.active);
  const role = currentUser?.role;
  const [bookings, setBookings] = useState(scenario.bookings);
  const [courses, setCourses] = useState(initialCourses);
  const [draft, setDraft] = useState<ReservationDraft>();
  const [menu, setMenu] = useState(false);
  const [sessionNotice, setSessionNotice] = useState("");
  const [simulationNotice, setSimulationNotice] = useState("");
  useEffect(() => {
    function onAction(event: Event) {
      const kind = (event as CustomEvent<string>).detail;
      if (kind === "expire") {
        setUserId(undefined);
        setDraft(undefined);
        setSessionNotice(
          "Tu sesión venció. Volvé a ingresar. Las reservas guardadas se conservan; la preparación sin guardar se descartó.",
        );
        return;
      }
      if (kind !== "version") return;
      const id = decodeURIComponent(
        window.location.pathname.split("/")[2] ?? "",
      );
      if (!id || id === "nueva") {
        setSimulationNotice(
          "Abrí una reserva y prepará una modificación antes de simular otra versión.",
        );
        return;
      }
      setBookings((old) =>
        old.map((b) =>
          b.id === id ? { ...b, version: (b.version ?? 0) + 1 } : b,
        ),
      );
      setSimulationNotice(
        `Simulación: ${id} recibió otra versión. Intentá guardar la edición que habías preparado.`,
      );
    }
    window.addEventListener("aulas:demo-action", onAction);
    return () => window.removeEventListener("aulas:demo-action", onAction);
  }, []);
  return (
    <CalendarContext value={calendars}>
      <RoomContext value={inventory}>
        <BrowserRouter>
          {!role ? (
            <Login
              notice={sessionNotice}
              onLogin={(email, password) => {
                const result = authenticate(users, email, password);
                if (result.error) return result.error;
                setSessionNotice("");
                setUserId(result.id);
              }}
            />
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
                    .filter(
                      (n) => role !== "Docente" || n[0] !== "/indicadores",
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
                  {role === "Administrador" && (
                    <NavLink
                      to="/administracion"
                      onClick={() => setMenu(false)}
                    >
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
                    onClick={() => setUserId(undefined)}
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
                      <Agenda
                        bookings={bookings}
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
                          save={(b) =>
                            setBookings((old) => [
                              ...old,
                              {
                                ...b,
                                registrant: {
                                  name: `${currentUser?.name} ${currentUser?.surname}`,
                                  email: currentUser?.email ?? "",
                                  userId: currentUser?.id,
                                },
                              },
                            ])
                          }
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
                          const yearError = yearMutationError(
                            current,
                            calendars,
                          );
                          if (yearError) return yearError;
                          const result = changeHeader(
                            current,
                            request,
                            courses,
                            role,
                            undefined,
                            inventory,
                          );
                          if (result.error) return result.error;
                          if (result.booking)
                            setBookings((old) =>
                              old.map((b) =>
                                b.id === id
                                  ? attributeChange(
                                      current,
                                      result.booking,
                                      currentUser,
                                    )
                                  : b,
                              ),
                            );
                        }}
                        reschedule={(id, request) => {
                          const current = bookings.find((b) => b.id === id);
                          if (!current) return "Reserva no encontrada.";
                          const yearError = yearMutationError(
                            current,
                            calendars,
                          );
                          if (yearError) return yearError;
                          const result = reschedule(
                            current,
                            request,
                            bookings,
                            role,
                            undefined,
                            inventory,
                            calendars.find(
                              (c) => c.year === bookingYear(current),
                            ),
                          );
                          if (result.error) return result.error;
                          if (result.booking)
                            setBookings((old) =>
                              old.map((b) =>
                                b.id === id
                                  ? attributeChange(
                                      current,
                                      result.booking,
                                      currentUser,
                                    )
                                  : b,
                              ),
                            );
                        }}
                        changeRoom={(id, request) => {
                          const current = bookings.find((b) => b.id === id);
                          if (!current) return "Reserva no encontrada.";
                          const yearError = yearMutationError(
                            current,
                            calendars,
                          );
                          if (yearError) return yearError;
                          const result = changeRoom(
                            current,
                            request,
                            bookings,
                            role,
                            undefined,
                            inventory,
                          );
                          if (result.error) return result.error;
                          if (result.booking)
                            setBookings((old) =>
                              old.map((b) =>
                                b.id === id
                                  ? attributeChange(
                                      current,
                                      result.booking,
                                      currentUser,
                                    )
                                  : b,
                              ),
                            );
                        }}
                        cancel={(id, request) => {
                          const current = bookings.find((b) => b.id === id);
                          if (!current)
                            return "La reserva ya no está disponible.";
                          const yearError = yearMutationError(
                            current,
                            calendars,
                          );
                          if (yearError) return yearError;
                          const result = cancelClasses(current, request, role);
                          if (result.error) return result.error;
                          if (result.booking)
                            setBookings((old) =>
                              old.map((b) =>
                                b.id === id
                                  ? attributeChange(
                                      current,
                                      result.booking,
                                      currentUser,
                                    )
                                  : b,
                              ),
                            );
                        }}
                      />
                    }
                  />
                  <Route
                    path="/reservas"
                    element={<Listing bookings={bookings} />}
                  />
                  <Route
                    path="/aulas"
                    element={
                      <Rooms
                        role={role}
                        save={(room, originalId) => {
                          const result = saveRoom(
                            inventory,
                            room,
                            originalId,
                            bookings,
                            role,
                          );
                          if (result.error) return result.error;
                          if (result.rooms) setInventory(result.rooms);
                        }}
                      />
                    }
                  />
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
                  <Route
                    path="/indicadores"
                    element={
                      role === "Docente" ? (
                        <Navigate to="/agenda" replace />
                      ) : (
                        <Indicators bookings={bookings} />
                      )
                    }
                  />
                  <Route
                    path="/administracion"
                    element={
                      role === "Administrador" ? (
                        <Users
                          users={users}
                          save={(user, password, confirmation) => {
                            const isNew = !users.some((u) => u.id === user.id);
                            if (isNew) {
                              const error = passwordError(
                                password,
                                confirmation,
                              );
                              if (error) return error;
                            }
                            const result = saveUser(users, user, userId ?? "");
                            if (result.error) return result.error;
                            if (result.users) {
                              if (isNew) {
                                const error = setCredential(
                                  result.users,
                                  userId ?? "",
                                  user.id,
                                  password,
                                  confirmation,
                                );
                                if (error) return error;
                              }
                              setUsers(result.users);
                              setBookings((old) =>
                                old.map((b) => {
                                  const registrant = result.users.find(
                                    (u) => u.id === b.registrant?.userId,
                                  );
                                  return registrant
                                    ? {
                                        ...b,
                                        registrant: {
                                          userId: registrant.id,
                                          name: `${registrant.name} ${registrant.surname}`,
                                          email: registrant.email,
                                          inactive: !registrant.active,
                                        },
                                      }
                                    : b;
                                }),
                              );
                            }
                          }}
                          reset={(id, password, confirmation) =>
                            setCredential(
                              users,
                              userId ?? "",
                              id,
                              password,
                              confirmation,
                            )
                          }
                        />
                      ) : (
                        <Navigate to="/agenda" replace />
                      )
                    }
                  />
                  <Route
                    path="/administracion/calendario"
                    element={
                      role === "Administrador" ? (
                        <CalendarEditor
                          key={calendar.year}
                          calendar={calendar}
                          calendars={calendars}
                          selectYear={setSelectedYear}
                          addYear={(year) => {
                            const result = addYear(calendars, year, role);
                            if (result.error) return result.error;
                            if (result.calendars) {
                              setCalendars(result.calendars);
                              setSelectedYear(year);
                            }
                          }}
                          deleteYear={() => {
                            const result = deleteYear(
                              calendars,
                              calendar.year,
                              bookings,
                              courses,
                              role,
                            );
                            if (result.error) return result.error;
                            if (result.calendars) {
                              setCalendars(result.calendars);
                              setSelectedYear(
                                result.calendars[0]?.year ?? 2026,
                              );
                            }
                          }}
                          preview={(proposal) => ({
                            ...changeCalendar(
                              calendar,
                              proposal,
                              bookings,
                              inventory,
                              role,
                            ),
                            stamp: JSON.stringify(
                              bookings.map((b) => [b.id, b.version ?? 0]),
                            ),
                          })}
                          save={(proposal, stamp) => {
                            if (
                              stamp !==
                              JSON.stringify(
                                bookings.map((b) => [b.id, b.version ?? 0]),
                              )
                            )
                              return "Las reservas cambiaron. Volvé a revisar el impacto.";
                            const result = changeCalendar(
                              calendar,
                              proposal,
                              bookings,
                              inventory,
                              role,
                            );
                            if (result.error) return result.error;
                            if (result.impact) {
                              setCalendars((old) =>
                                old.map((c) =>
                                  c.year === result.impact.calendar.year
                                    ? result.impact.calendar
                                    : c,
                                ),
                              );
                              setBookings(result.impact.bookings);
                            }
                          }}
                        />
                      ) : (
                        <Navigate to="/agenda" replace />
                      )
                    }
                  />
                  <Route path="*" element={<Navigate to="/agenda" replace />} />
                </Routes>
              </main>
              {simulationNotice && (
                <p className="demo-controls" role="status">
                  {simulationNotice}
                </p>
              )}
              <footer>
                Demostración académica · Datos ficticios · Los cambios se
                reinician al recargar
              </footer>
            </>
          )}
        </BrowserRouter>
      </RoomContext>
    </CalendarContext>
  );
}
export default function DemoApp() {
  const [id, setId] = useState<ScenarioId>("base");
  const [scenario, setScenario] = useState(() => createScenario("base"));
  const [revision, setRevision] = useState(0);
  const [fault, setFault] = useState<DemoQueryFault>({
    mode: "normal",
    revision: 0,
  });
  return (
    <>
      <DemoQueryContext
        value={{
          fault,
          retry: () =>
            setFault((f) => ({ mode: "normal", revision: f.revision + 1 })),
        }}
      >
        <App key={revision} scenario={scenario} />
      </DemoQueryContext>
      <DemoControls
        current={id}
        now={scenario.now}
        queryMode={fault.mode}
        simulateQuery={(mode) =>
          setFault((f) => ({ mode, revision: f.revision + 1 }))
        }
        simulateAction={(kind) =>
          window.dispatchEvent(
            new CustomEvent("aulas:demo-action", { detail: kind }),
          )
        }
        apply={(next) => {
          setFault({ mode: "normal", revision: 0 });
          const state = createScenario(next);
          setDemoNow(state.now);
          resetDemoCredentials();
          window.history.replaceState(null, "", "/agenda");
          setId(next);
          setScenario(state);
          setRevision((value) => value + 1);
        }}
      />
    </>
  );
}
