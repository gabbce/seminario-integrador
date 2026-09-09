import { useCalendar, useCalendars } from "../calendar-context";
import { useRooms } from "../room-context";
import { type ReservationDraft } from "../reservation-draft";
import { SporadicDates } from "../components/SporadicDates";
import { validateDates } from "../booking-dates";
import { overlaps, type Occurrence } from "../domain";
import {
  compatible,
  resourcesFor,
  resourceLabels,
  type Resource,
} from "../equipment";
import { type Course } from "../catalog";
import { CoursePicker } from "../components/CoursePicker";
import { teachers } from "../teachers";
import { RoomChoices } from "../components/RoomChoices";
import { ScheduleDates } from "../components/ScheduleDates";
import {
  defaultSchedule,
  omittedDates,
  periodLabels as defaultPeriodLabels,
  type Period,
  type Schedule,
} from "../calendar";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ArrowRight } from "lucide-react";
import {
  available,
  datesFor,
  dayNames,
  expand,
  minutes,
  validateBooking,
  type Pattern,
  type Booking,
  dateLabel,
} from "../domain";
import { Button } from "../components/ui/button";

export function Wizard({
  bookings,
  save,
  role,
  courses,
  addCourse,
  queryOnly = false,
  initial,
  onPrepare,
  onConsume,
}: {
  bookings: Booking[];
  courses: Course[];
  addCourse: (course: Course) => void;
  role: "Administrador" | "Bedel" | "Docente";
  queryOnly?: boolean;
  onConsume?: () => void;
  initial?: ReservationDraft;
  onPrepare?: (draft: ReservationDraft) => void;
  save: (b: Booking) => void;
}) {
  const [year, setYear] = useState(initial?.schedule.year ?? 2026);
  const calendars = useCalendars();
  const calendar = useCalendar(year);
  const terms = calendar.terms;
  const periodLabels = Object.fromEntries(
    Object.entries(defaultPeriodLabels).map(([key, label]) => [
      key,
      label.replace("2026", String(year)),
    ]),
  ) as typeof defaultPeriodLabels;
  const rooms = useRooms();
  const go = useNavigate();
  useEffect(() => {
    if (initial) onConsume?.();
  }, [initial, onConsume]);
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<"periodic" | "sporadic">(
    initial?.mode ?? "periodic",
  );
  const [dates, setDates] = useState<Occurrence[]>(
    initial?.dates ?? [
      { date: "2026-09-14", start: "14:00", end: "16:00", room: "" },
      { date: "2026-09-21", start: "16:00", end: "17:30", room: "" },
    ],
  );
  const [subject, setSubject] = useState(
    courses.find((c) => c.year === year)?.subject ?? "",
  );
  const [course, setCourse] = useState(
    courses.find((c) => c.year === year)?.id ?? "",
  );
  const [teacher, setTeacher] = useState("Laura Gómez");
  const [students, setStudents] = useState(initial?.students ?? 30);
  const [type, setType] = useState(initial?.type ?? "Multimedios");
  const [resources, setResources] = useState<Resource[]>(
    initial?.resources ?? [],
  );
  const [board, setBoard] = useState(initial?.board ?? "");
  const requirements = { type, students, resources, board };
  const [patterns, setPatterns] = useState<Pattern[]>(
    initial?.patterns ?? [
      { day: 1, start: "14:00", end: "16:00", room: "" },
      { day: 3, start: "14:00", end: "16:00", room: "" },
    ],
  );
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<Booking | null>(null);
  const [schedule, setSchedule] = useState<Schedule>(
    initial?.schedule ?? { ...defaultSchedule, year },
  );
  const occurrences =
    mode === "periodic" ? expand(patterns, schedule, calendar) : dates;
  const omitted =
    mode === "periodic" ? omittedDates(patterns, schedule, calendar) : [];
  const endTime = (start: string, duration: number) => {
    const total = minutes(start) + duration;
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  };
  const booking = {
    id: `R-${String(bookings.length + 1).padStart(3, "0")}`,
    subject,
    course,
    teacher,
    teacherEmail: teachers.find((t) => t.name === teacher)?.email,
    registrant: {
      name: "Demo · " + role,
      email: role === "Administrador" ? "admin@demo.local" : "bedel@demo.local",
    },
    ...requirements,
    occurrences,
    ...(mode === "periodic" ? { schedule, patterns } : {}),
  };
  function update(day: number, patch: Partial<Pattern>) {
    setPatterns((p) => p.map((x) => (x.day === day ? { ...x, ...patch } : x)));
  }
  function next(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (
      mode === "periodic" &&
      (!patterns.length ||
        patterns.some(
          (p) =>
            !Number.isFinite(minutes(p.start)) ||
            minutes(p.start) >= minutes(p.end) ||
            minutes(p.end) > 1380,
        ))
    ) {
      setError(
        "Seleccioná al menos un día y un horario de inicio anterior al final.",
      );
      return;
    }
    if (
      mode === "periodic" &&
      patterns.some(
        (p) => datesFor(p.day, schedule, p.start, calendar).length === 0,
      )
    ) {
      setError(
        "Cada día semanal seleccionado debe tener al menos una clase futura. Ajustá el período, los días o las exclusiones.",
      );
      return;
    }
    if (calendar.state !== "Habilitado") {
      setError("El año no está habilitado para reservas.");
      return;
    }
    const invalidDates = validateDates(occurrences, undefined, calendar);
    if (invalidDates) {
      setError(invalidDates);
      return;
    }
    if (step === 1) {
      setDates((current) =>
        current.map((o) => {
          const room = rooms.find((r) => r.id === o.room);
          return room &&
            compatible(room, requirements) &&
            !bookings.some((b) =>
              b.occurrences.some(
                (other) => !other.cancelled && overlaps(o, other),
              ),
            )
            ? o
            : { ...o, room: "" };
        }),
      );
      setPatterns((current) =>
        current.map((pattern) => {
          const room = rooms.find((candidate) => candidate.id === pattern.room);
          return room &&
            compatible(room, requirements) &&
            available(pattern, room.id, bookings, schedule, calendar)
            ? pattern
            : { ...pattern, room: "" };
        }),
      );
      setStep(2);
      return;
    }
    if (queryOnly) return;
    const issue = validateBooking(booking, bookings, rooms, calendar);
    if (issue) {
      setError(issue);
      return;
    }
    if (step === 2) setStep(3);
    else {
      save(booking);
      setSaved(booking);
    }
  }
  if (saved)
    return (
      <section className="success panel">
        <div className="success-icon">
          <Check />
        </div>
        <p className="eyebrow">RESERVA {saved.id}</p>
        <h1>Reserva confirmada</h1>
        <p>
          Se registraron {occurrences.length} clases de {subject}.
        </p>
        <p className="muted">
          {course} · {teacher} · {students} alumnos previstos
        </p>
        <div className="actions">
          <Button onClick={() => go(`/reservas/${saved.id}`)}>
            Ver detalle
          </Button>
          <Button variant="outline" onClick={() => go("/agenda")}>
            Volver a la agenda
          </Button>
        </div>
      </section>
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {mode === "periodic"
              ? "ORGANIZAR EL CUATRIMESTRE"
              : "RESERVAR FECHAS PUNTUALES"}
          </p>
          <h1>
            {queryOnly
              ? "Disponibilidad de aulas"
              : `Nueva reserva ${mode === "periodic" ? "periódica" : "esporádica"}`}
          </h1>
        </div>
        <Button variant="ghost" onClick={() => go("/agenda")}>
          Salir
        </Button>
      </div>
      <ol className="steps">
        {(queryOnly
          ? ["Criterios y fechas", "Resultados"]
          : ["Datos y horarios", "Elegir aulas", "Revisar y confirmar"]
        ).map((s, i) => (
          <li
            key={s}
            aria-current={step === i + 1 ? "step" : undefined}
            className={step >= i + 1 ? "current" : ""}
          >
            <span>{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
      <form onSubmit={next} className="wizard">
        <div>
          <section className="panel">
            <h2>
              {step === 1
                ? queryOnly
                  ? "Criterios de búsqueda"
                  : "Datos de la reserva"
                : step === 2
                  ? mode === "periodic"
                    ? "Un aula para cada día semanal"
                    : "Un aula para cada fecha"
                  : "Todo listo para revisar"}
            </h2>
            <p className="muted">
              {step === 1
                ? mode === "periodic"
                  ? "Reuní los datos de la clase y definí su frecuencia."
                  : "Reuní los datos de la clase y agregá las fechas necesarias."
                : step === 2
                  ? mode === "periodic"
                    ? "El aula elegida se mantiene en todas las clases de ese día durante el período."
                    : "Elegí un aula disponible para cada fecha y horario."
                  : "La disponibilidad se verifica nuevamente al confirmar."}
            </p>
            {step === 1 ? (
              <>
                <div className="weekdays" role="group" aria-label="Modalidad">
                  <Button
                    type="button"
                    variant={mode === "periodic" ? "default" : "outline"}
                    onClick={() => {
                      setMode("periodic");
                      setError("");
                    }}
                  >
                    Periódica
                  </Button>
                  <Button
                    type="button"
                    variant={mode === "sporadic" ? "default" : "outline"}
                    onClick={() => {
                      setMode("sporadic");
                      setError("");
                    }}
                  >
                    Esporádica
                  </Button>
                </div>
                <label>
                  Año lectivo
                  <select
                    aria-label="Año de la reserva"
                    value={year}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      setYear(next);
                      setSchedule({ ...defaultSchedule, year: next });
                      setPatterns((old) =>
                        old.map((p) => ({ ...p, room: "" })),
                      );
                      setDates([
                        {
                          date: `${next}-09-14`,
                          start: "14:00",
                          end: "16:00",
                          room: "",
                        },
                      ]);
                      const c = courses.find((c) => c.year === next);
                      setCourse(c?.id ?? "");
                      setSubject(c?.subject ?? "");
                      setError("");
                    }}
                  >
                    {calendars.map((c) => (
                      <option key={c.year} value={c.year}>
                        {c.year} · {c.state}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="form-grid">
                  {!queryOnly && (
                    <CoursePicker
                      year={year}
                      courses={courses}
                      selected={course}
                      choose={(c) => {
                        setCourse(c.id);
                        setSubject(c.subject);
                      }}
                      add={addCourse}
                    />
                  )}
                  {!queryOnly && (
                    <label>
                      Docente
                      <select
                        value={teacher}
                        onChange={(e) => setTeacher(e.target.value)}
                      >
                        {teachers.map((t) => (
                          <option key={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label>
                    Cantidad de alumnos prevista
                    <input
                      type="number"
                      min="1"
                      required
                      value={students}
                      onChange={(e) => setStudents(Number(e.target.value))}
                    />
                  </label>
                  <label>
                    Tipo de aula
                    <select
                      value={type}
                      onChange={(e) => {
                        setType(e.target.value);
                        setResources((current) =>
                          current.filter((r) =>
                            resourcesFor(e.target.value).includes(r),
                          ),
                        );
                      }}
                    >
                      {["Multimedios", "General", "Laboratorio"].map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </label>
                  {mode === "periodic" && (
                    <label>
                      Período
                      <select
                        aria-label="Período"
                        value={schedule.period}
                        onChange={(e) =>
                          setSchedule({
                            period: e.target.value as Period,
                            excluded: [],
                          })
                        }
                      >
                        {Object.entries(periodLabels).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
                <fieldset className="equipment">
                  <legend>Características requeridas</legend>
                  <label>
                    Tipo de pizarrón
                    <select
                      aria-label="Tipo de pizarrón"
                      value={board}
                      onChange={(e) => setBoard(e.target.value)}
                    >
                      <option value="">Cualquiera</option>
                      <option>Tiza</option>
                      <option>Fibrón</option>
                    </select>
                  </label>
                  <div className="weekdays">
                    {resourcesFor(type).map((r) => (
                      <label key={r}>
                        <input
                          type="checkbox"
                          checked={resources.includes(r)}
                          onChange={(e) =>
                            setResources((current) =>
                              e.target.checked
                                ? [...current, r]
                                : current.filter((x) => x !== r),
                            )
                          }
                        />
                        {resourceLabels[r]}
                      </label>
                    ))}
                  </div>
                </fieldset>
                {mode === "sporadic" ? (
                  <SporadicDates year={year} dates={dates} change={setDates} />
                ) : (
                  <div className="section-divider">
                    <h2>Días y horarios</h2>
                    <p className="muted">
                      {schedule.period === "annual"
                        ? "Ambos cuatrimestres, sin clases en el receso"
                        : `${terms[schedule.period][0] ? dateLabel(terms[schedule.period][0]) : "Sin inicio"} al ${terms[schedule.period][1] ? dateLabel(terms[schedule.period][1]) : "Sin fin"}`}
                    </p>
                    <div className="weekdays">
                      {[1, 2, 3, 4, 5].map((day) => (
                        <label
                          key={day}
                          className={
                            patterns.some((p) => p.day === day)
                              ? "selected"
                              : ""
                          }
                        >
                          <input
                            type="checkbox"
                            checked={patterns.some((p) => p.day === day)}
                            onChange={(e) =>
                              setPatterns((old) =>
                                e.target.checked
                                  ? [
                                      ...old,
                                      {
                                        day,
                                        start: "14:00",
                                        end: "16:00",
                                        room: "",
                                      },
                                    ].sort((a, b) => a.day - b.day)
                                  : old.filter((p) => p.day !== day),
                              )
                            }
                          />
                          {dayNames[day]}
                        </label>
                      ))}
                    </div>
                    {patterns.map((p) => (
                      <div className="pattern" key={p.day}>
                        <strong>{dayNames[p.day]}</strong>
                        <label>
                          Desde
                          <input
                            type="time"
                            min="07:00"
                            max="22:30"
                            step="1800"
                            required
                            value={p.start}
                            onChange={(e) =>
                              update(p.day, {
                                start: e.target.value,
                                end: endTime(
                                  e.target.value,
                                  minutes(p.end) - minutes(p.start),
                                ),
                              })
                            }
                          />
                        </label>
                        <label>
                          Duración
                          <select
                            value={minutes(p.end) - minutes(p.start)}
                            onChange={(e) =>
                              update(p.day, {
                                end: endTime(p.start, Number(e.target.value)),
                              })
                            }
                          >
                            {Array.from(
                              { length: 32 },
                              (_, i) => (i + 1) * 30,
                            ).map((n) => (
                              <option key={n} value={n}>
                                {n / 60} h
                              </option>
                            ))}
                          </select>
                        </label>
                        <div className="calculated-end">
                          <small>Finaliza</small>
                          <strong>{p.end}</strong>
                        </div>
                      </div>
                    ))}
                    <ScheduleDates
                      patterns={patterns}
                      schedule={schedule}
                      change={setSchedule}
                    />
                  </div>
                )}
              </>
            ) : step === 2 ? (
              mode === "sporadic" ? (
                dates.map((o, index) => (
                  <fieldset className="room-options" key={o.date}>
                    <legend>
                      {dateLabel(o.date)} · {o.start}–{o.end}
                    </legend>
                    <RoomChoices
                      readOnly={queryOnly}
                      privateContacts={role !== "Docente"}
                      mode="sporadic"
                      request={[o]}
                      candidates={rooms.filter((r) =>
                        compatible(r, requirements),
                      )}
                      bookings={bookings}
                      selected={o.room}
                      onSelect={(room) =>
                        setDates((current) =>
                          current.map((x, i) =>
                            i === index ? { ...x, room } : x,
                          ),
                        )
                      }
                      name={`date-${index}`}
                    />
                  </fieldset>
                ))
              ) : (
                patterns.map((p) => (
                  <fieldset className="room-options" key={p.day}>
                    <legend>
                      {dayNames[p.day]} · {p.start}–{p.end}{" "}
                      <small>
                        {datesFor(p.day, schedule, p.start, calendar).length}{" "}
                        clases
                      </small>
                    </legend>
                    <RoomChoices
                      readOnly={queryOnly}
                      privateContacts={role !== "Docente"}
                      request={expand([p], schedule, calendar)}
                      candidates={rooms.filter((r) =>
                        compatible(r, requirements),
                      )}
                      bookings={bookings}
                      selected={p.room}
                      onSelect={(room) => update(p.day, { room })}
                      name={`room-${p.day}`}
                    />
                  </fieldset>
                ))
              )
            ) : (
              <>
                <div className="review-data">
                  <h3>
                    {subject} <small>{course}</small>
                  </h3>
                  <p>
                    {teacher} · {students} alumnos previstos
                  </p>
                  {mode === "periodic" &&
                    patterns.map((p) => (
                      <p key={p.day}>
                        <strong>{dayNames[p.day]}</strong> · {p.start}–{p.end} ·
                        Aula {p.room} ·{" "}
                        {datesFor(p.day, schedule, p.start, calendar).length}{" "}
                        clases
                      </p>
                    ))}
                </div>
                <details>
                  <summary>
                    Ver las {occurrences.length} fechas a registrar
                  </summary>
                  <div className="date-list">
                    {occurrences.map((o) => (
                      <p key={o.date}>
                        {dateLabel(o.date)} · {o.start}–{o.end} · Aula {o.room}
                      </p>
                    ))}
                  </div>
                </details>
                <details>
                  <summary>Ver fechas omitidas ({omitted.length})</summary>
                  <div className="date-list">
                    {omitted.map((o) => (
                      <p key={o.date}>
                        {dateLabel(o.date)} · {o.reason}
                      </p>
                    ))}
                  </div>
                </details>
              </>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div className="form-actions">
              {step > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setError("");
                    setStep(step - 1);
                  }}
                >
                  Volver
                </Button>
              )}
              {queryOnly && step === 2 ? (
                role !== "Docente" && (
                  <Button
                    type="button"
                    onClick={() => {
                      onPrepare?.({
                        mode,
                        students,
                        type,
                        resources,
                        board,
                        patterns,
                        dates,
                        schedule,
                      });
                      go("/reservas/nueva");
                    }}
                  >
                    Preparar reserva
                  </Button>
                )
              ) : (
                <Button
                  type="submit"
                  disabled={step === 2 && occurrences.some((p) => !p.room)}
                >
                  {step === 3
                    ? "Confirmar reserva"
                    : step === 2
                      ? "Revisar reserva"
                      : "Buscar aulas"}
                  <ArrowRight />
                </Button>
              )}
            </div>
          </section>
        </div>
        <aside className="panel summary">
          <p className="eyebrow">
            {queryOnly ? "CRITERIOS CONSULTADOS" : "TU RESERVA"}
          </p>
          <h2>{queryOnly ? "Tu consulta" : subject || "Nueva clase"}</h2>
          {!queryOnly && <p>{course}</p>}
          <hr />
          {!queryOnly && <p>{teacher}</p>}
          <p>{students} alumnos previstos</p>
          <p>{type}</p>
          <p>
            {[board, ...resources.map((r) => resourceLabels[r])]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <hr />
          <p className="big-number">
            {occurrences.length}
            <span>clases previstas</span>
          </p>
          <p>
            {mode === "periodic"
              ? periodLabels[schedule.period]
              : `Fechas independientes · ${year}`}
          </p>
          <p className="muted">
            {omitted.filter((o) => o.reason === "Exclusión manual").length}{" "}
            exclusiones manuales ·{" "}
            {omitted.filter((o) => o.reason !== "Exclusión manual").length}{" "}
            fechas omitidas por calendario o pasado.
          </p>
        </aside>
      </form>
    </>
  );
}
