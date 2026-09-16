import {
  bookingYear,
  yearMutationError,
} from "./academic-years";
import { CalendarContext } from "./calendar-context";
import { createScenario } from "./demo-scenarios";

import { emptyCalendar, type CalendarConfig } from "./calendar";
import PersistedCalendar from "./pages/PersistedCalendar";
import { Users } from "./pages/Users";
import { type User } from "./users";
import { api } from "./api";
import { RoomContext } from "./room-context";

import { changeHeader } from "./booking-header";
import { reschedule } from "./reschedule";
import { changeRoom } from "./room-change";
import { cancelClasses } from "./cancellation";
import { type ReservationDraft } from "./reservation-draft";
import { initialCourses } from "./catalog";

import { useState, useEffect } from "react";
import { Routes, Route, NavLink, Navigate } from "react-router-dom";
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
import { validateBooking, type Booking, type Room } from "./domain";
import "./App.css";
import type { Profile } from "./auth-client";
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
export default function App({
  currentUser,
  onLogout,
}: {
  currentUser: Profile;
  onLogout: () => void;
}) {
  const [scenario] = useState(() => createScenario("base"));
  const [calendars, setCalendars] = useState<CalendarConfig[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarError, setCalendarError] = useState("");
  useEffect(() => {
    let active = true;
    const load = () => { void api<CalendarConfig[]>("/referencias/calendarios").then(rows => {
      if(active) {setCalendars(rows);setCalendarError("");}
    }).catch(e => { if(active) setCalendarError(e.message); }).finally(() => { if(active) setCalendarLoading(false); }); };
    load(); window.addEventListener("aulas-calendar-refresh",load);
    return () => { active=false;window.removeEventListener("aulas-calendar-refresh",load); };
  }, []);
  const [agendaDate, setAgendaDate] = useState(scenario.now.slice(0, 10));
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
  const [bookings, setBookings] = useState(scenario.bookings);
  const [courses, setCourses] = useState(initialCourses);
  const [draft, setDraft] = useState<ReservationDraft>();
  const [menu, setMenu] = useState(false);

  return (
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
                  <NavLink key={path} to={path} onClick={() => setMenu(false)}>
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
            {calendarError && <p role="alert">{calendarError} <Button onClick={() => window.dispatchEvent(new Event("aulas-calendar-refresh"))}>Reintentar calendario</Button></p>}
            {(inventoryLoading || calendarLoading) && <p role="status">Cargando datos…</p>}
            {!inventoryError && !inventoryLoading && !calendarError && !calendarLoading && (
              <Routes>
                <Route
                  path="/agenda"
                  element={
                    <Agenda
                      date={agendaDate}
                      setDate={setAgendaDate}
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
                        save={(b) => {
                          if (bookings.some((existing) => existing.id === b.id))
                            return "Esta reserva ya está registrada. Consultá su detalle antes de volver a enviarla.";
                          const failure = validateBooking(
                            b,
                            bookings,
                            inventory,
                            calendars.find((c) => c.year === bookingYear(b)) ??
                              emptyCalendar(bookingYear(b)),
                          );
                          if (failure) return failure;
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
                          ]);
                        }}
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
                        const yearError = yearMutationError(current, calendars);
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
                        const yearError = yearMutationError(current, calendars);
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
                        const yearError = yearMutationError(current, calendars);
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
                        const yearError = yearMutationError(current, calendars);
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
                <Route path="/aulas" element={<Rooms role={role} />} />
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
                      <PersistedCalendar />
                    ) : (
                      <Navigate to="/agenda" replace />
                    )
                  }
                />
                <Route path="*" element={<Navigate to="/agenda" replace />} />
              </Routes>
            )}
          </main>
          <footer>Demostración académica · Datos ficticios</footer>
        </>
      </RoomContext>
    </CalendarContext>
  );
}
