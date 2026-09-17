import { ApiError } from "../api";
import {
  confirmPeriodic,
  operationResult,
  type ConfirmationRequest,
} from "../periodic-confirmation";
import { usePeriodicPreparation } from "../periodic-preparation";
import { PreparedRoomChoices } from "../components/PreparedRoomChoices";
import { FormError, FieldError } from "../components/FormError";
import { useCalendar, useCalendars } from "../calendar-context";
import { type ReservationDraft } from "../reservation-draft";
import { resourcesFor, resourceLabels, type Resource } from "../equipment";
import { courseLabel, type Course } from "../catalog";
import { CoursePicker } from "../components/CoursePicker";
import { useTeachers } from "../teacher-context";
import { ScheduleDates } from "../components/ScheduleDates";
import {
  defaultSchedule,
  periodLabels as defaultPeriodLabels,
  type Period,
  type Schedule,
} from "../calendar";
import { useRef, useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ArrowRight } from "lucide-react";
import {
  dayNames,
  minutes,
  type Pattern,
  type Booking,
  dateLabel,
} from "../domain";
import { Button } from "../components/ui/button";
export function Wizard({
  onConfirmed,
  role,
  courses,
  addCourse,
  queryOnly = false,
  initial,
  onPrepare,
  onConsume,
}: {
  courses: Course[];
  addCourse: (course: Course) => void;
  role: "Administrador" | "Bedel" | "Docente";
  queryOnly?: boolean;
  onConsume?: () => void;
  initial?: ReservationDraft;
  onPrepare?: (draft: ReservationDraft) => void;
  onConfirmed?: (booking: Booking) => void;
}) {
  const teachers = useTeachers();
  const [saving, setSaving] = useState(false),
    [uncertain, setUncertain] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const calendars = useCalendars();
  const [year, setYear] = useState(
    initial?.schedule.year ??
      calendars.find((c) => c.state === "Habilitado")?.year ??
      new Date().getFullYear(),
  );
  const calendar = useCalendar(year);
  const terms = calendar.terms;
  const periodLabels = Object.fromEntries(
    Object.entries(defaultPeriodLabels).map(([key, label]) => [
      key,
      label.replace("2026", String(year)),
    ]),
  ) as typeof defaultPeriodLabels;
  const go = useNavigate();
  useEffect(() => {
    if (initial) onConsume?.();
  }, [initial, onConsume]);
  const [step, setStep] = useState(1);
  const [subject, setSubject] = useState(
    courses.find((c) => c.year === year)?.subject ?? "",
  );
  const [course, setCourse] = useState(
    courses.find((c) => c.year === year)?.id ?? "",
  );
  const [teacher, setTeacher] = useState(teachers[0]?.name ?? "");
  const [students, setStudents] = useState(initial?.students ?? 30);
  const [type, setType] = useState(initial?.type ?? "Multimedios");
  const [resources, setResources] = useState<Resource[]>(
    initial?.resources ?? [],
  );
  const [board, setBoard] = useState(initial?.board ?? "");
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
  const preparationKey = JSON.stringify({
    year,
    courseId: queryOnly ? undefined : course || undefined,
    period: schedule.period,
    students,
    type,
    board,
    resources,
    excluded: schedule.excluded,
    patterns: patterns.map((p) => ({
      day: p.day,
      start: p.start,
      modules: (minutes(p.end) - minutes(p.start)) / 30,
    })),
  });
  const preparation = usePeriodicPreparation(preparationKey);
  const [selectionKey, setSelectionKey] = useState<string | null>(null);
  const occurrences =
    preparation.data?.patterns.flatMap((p) =>
      p.dates.map((date) => ({
        date,
        start: p.start,
        end: p.end,
        room:
          selectionKey === preparationKey
            ? (patterns.find((pattern) => pattern.day === p.day)?.room ?? "")
            : "",
      })),
    ) ?? [];
  const omitted = preparation.data?.patterns.flatMap((p) => p.omitted) ?? [];
  const endTime = (start: string, duration: number) => {
    const total = minutes(start) + duration;
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  };
  const chosenCourse = courses.find((c) => c.id === course);
  const visibleCourse = chosenCourse ? courseLabel(chosenCourse) : "";
  const response = preparation;
  const attempt = useRef<ConfirmationRequest | null>(null);
  async function submitConfirmation(request: ConfirmationRequest) {
    setSaving(true);
    setError("");
    try {
      const confirmed = await confirmPeriodic(request);
      if (!mounted.current) return;
      setUncertain(false);
      setSaved(confirmed);
      onConfirmed?.(confirmed);
    } catch (failure) {
      if (!mounted.current) return;
      const message =
        failure instanceof Error
          ? failure.message
          : "No pudimos confirmar la reserva.";
      if (!(failure instanceof ApiError) || failure.status >= 500) {
        setUncertain(true);
        setError(message);
      } else {
        attempt.current = null;
        setUncertain(false);
        setError(message);
        setStep(2);
        preparation.retry();
      }
    } finally {
      if (mounted.current) setSaving(false);
    }
  }
  function update(day: number, patch: Partial<Pattern>) {
    setPatterns((p) => p.map((x) => (x.day === day ? { ...x, ...patch } : x)));
  }
  async function next(e: FormEvent) {
    e.preventDefault();
    if (saving || uncertain || preparation.status !== "ready") return;
    setError("");
    if (!queryOnly && (!course || !teacher)) {
      setError("Seleccioná curso y docente.");
      return;
    }
    if (
      !preparation.data?.patterns.length ||
      preparation.data.patterns.some((p) => !p.dates.length)
    ) {
      setError(
        "Cada día semanal seleccionado debe tener al menos una clase futura. Ajustá el período, los días o las exclusiones.",
      );
      return;
    }
    if (step === 1) {
      setPatterns((current) =>
        current.map((p) => ({
          ...p,
          room:
            selectionKey === preparationKey &&
            preparation.data?.patterns
              .find((candidate) => candidate.day === p.day)
              ?.availableRooms.some((room) => room.id === p.room)
              ? p.room
              : "",
        })),
      );
      setSelectionKey(preparationKey);
      setStep(2);
      return;
    }
    if (queryOnly) return;
    if (
      preparation.data.patterns.some(
        (p) =>
          !p.availableRooms.some(
            (room) =>
              room.id ===
              patterns.find((pattern) => pattern.day === p.day)?.room,
          ),
      )
    ) {
      setError("Elegí un aula disponible para cada día semanal.");
      return;
    }
    if (step === 2) {
      setStep(3);
      return;
    }
    const request: ConfirmationRequest = attempt.current ?? {
      operationId: crypto.randomUUID(),
      proposal: JSON.parse(preparationKey!),
      teacherId: teachers.find((t) => t.name === teacher)!.id,
      calendarVersion: preparation.data.calendarVersion,
      selections: preparation.data.patterns.map((p) => {
        const room = p.availableRooms.find(
          (room) =>
            room.id === patterns.find((pattern) => pattern.day === p.day)?.room,
        )!;
        return {
          day: p.day,
          roomId: room.internalId!,
          roomVersion: room.version!,
          dates: [...p.dates],
        };
      }),
    };
    attempt.current = request;
    await submitConfirmation(request);
  }
  if (uncertain)
    return (
      <section className="panel">
        <h1>No pudimos confirmar el resultado</h1>
        <p>
          La propuesta se conserva. Comprobá el resultado o reintentá esta misma
          operación.
        </p>
        <div className="actions">
          <Button
            disabled={saving}
            onClick={async () => {
              if (!attempt.current) return;
              setSaving(true);
              setError("");
              try {
                const result = await operationResult(
                  attempt.current.operationId,
                );
                if (!mounted.current) return;
                if (result.found && result.booking) {
                  setUncertain(false);
                  setSaved(result.booking);
                  onConfirmed?.(result.booking);
                } else
                  setError(
                    "La operación todavía no figura confirmada. Podés reintentar la misma propuesta de forma segura.",
                  );
              } catch (failure) {
                if (mounted.current)
                  setError(
                    failure instanceof Error
                      ? failure.message
                      : "No pudimos comprobar el resultado.",
                  );
              } finally {
                if (mounted.current) setSaving(false);
              }
            }}
          >
            Comprobar estado de la reserva
          </Button>
          <Button
            variant="outline"
            disabled={saving}
            onClick={() => {
              if (attempt.current) void submitConfirmation(attempt.current);
            }}
          >
            Reintentar la misma operación
          </Button>
        </div>
        {error && <p role="alert">{error}</p>}
      </section>
    );
  if (saved)
    return (
      <section className="success panel">
        <div className="success-icon">
          <Check />
        </div>
        <p className="eyebrow">RESERVA {saved.id}</p>
        <h1>Reserva confirmada</h1>
        <p>
          Se registraron {saved.occurrences.length} clases de {saved.subject}.
        </p>
        <p className="muted">
          {saved.course} · {saved.teacher} · {saved.students} alumnos previstos
        </p>
        <div className="actions">
          <Button onClick={() => go(`/reservas/${saved.id}`)}>
            Ver detalle
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              go(`/agenda?fecha=${saved.occurrences[0]?.date ?? ""}`)
            }
          >
            Ver en la agenda
          </Button>
        </div>
      </section>
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{"ORGANIZAR EL CUATRIMESTRE"}</p>
          <h1>
            {queryOnly
              ? "Disponibilidad de aulas"
              : `Nueva reserva ${"periódica"}`}
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
                  ? "Un aula para cada día semanal"
                  : "Todo listo para revisar"}
            </h2>
            <p className="muted">
              {step === 1
                ? "Reuní los datos de la clase y definí su frecuencia."
                : step === 2
                  ? "El aula elegida se mantiene en todas las clases de ese día durante el período."
                  : "Esta consulta no ocupa las aulas."}
            </p>
            {step === 1 ? (
              <>
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
                      id="booking-students"
                      aria-label="Cantidad de alumnos prevista"
                      aria-invalid={
                        error.includes("Indicá alumnos") || undefined
                      }
                      aria-describedby={
                        error.includes("Indicá alumnos")
                          ? "booking-students-error"
                          : undefined
                      }
                      type="number"
                      min="1"
                      required
                      value={students}
                      onChange={(e) => setStudents(Number(e.target.value))}
                    />
                    <FieldError
                      id="booking-students-error"
                      message={error.includes("Indicá alumnos") ? error : ""}
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
                  {
                    <label>
                      Período
                      <select
                        aria-label="Período"
                        value={schedule.period}
                        onChange={(e) =>
                          setSchedule({
                            year,
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
                  }
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
                {
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
                            onChange={(e) => {
                              if (!e.target.checked)
                                setSchedule((current) => ({
                                  ...current,
                                  excluded: current.excluded.filter(
                                    (date) =>
                                      new Date(
                                        `${date}T12:00:00Z`,
                                      ).getUTCDay() !== day,
                                  ),
                                }));
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
                              );
                            }}
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
                      prepared={preparation.data ?? null}
                    />
                  </div>
                }
              </>
            ) : step === 2 && response.status !== "ready" ? (
              <section
                className="panel"
                role={response.status === "error" ? "alert" : "status"}
              >
                <h2>
                  {response.status === "error"
                    ? "No pudimos consultar la disponibilidad"
                    : "Consultando disponibilidad…"}
                </h2>
                <p>La preparación se conserva en esta pantalla.</p>
                {response.status === "error" && (
                  <Button type="button" onClick={response.retry}>
                    Reintentar consulta
                  </Button>
                )}
              </section>
            ) : step === 2 ? (
              patterns.map((p) => (
                <fieldset className="room-options" key={p.day}>
                  <legend>
                    {dayNames[p.day]} · {p.start}–{p.end}{" "}
                    <small>
                      {preparation.data?.patterns.find(
                        (pattern) => pattern.day === p.day,
                      )?.dates.length ?? 0}{" "}
                      {preparation.data?.patterns.find(
                        (pattern) => pattern.day === p.day,
                      )?.dates.length === 1
                        ? "clase"
                        : "clases"}
                    </small>
                  </legend>
                  {preparation.data?.patterns.find(
                    (pattern) => pattern.day === p.day,
                  ) && (
                    <PreparedRoomChoices
                      readOnly={queryOnly}
                      pattern={preparation.data.patterns.find(
                        (pattern) => pattern.day === p.day,
                      )!}
                      selected={selectionKey === preparationKey ? p.room : ""}
                      onSelect={(room) => update(p.day, { room })}
                    />
                  )}
                </fieldset>
              ))
            ) : (
              <>
                <div className="review-data">
                  <h3>
                    {subject} <small>{visibleCourse}</small>
                  </h3>
                  <p>
                    {teacher} · {students} alumnos previstos
                  </p>
                  {patterns.map((p) => (
                    <p key={p.day}>
                      <strong>{dayNames[p.day]}</strong> · {p.start}–{p.end} ·
                      Aula {p.room} ·{" "}
                      {preparation.data?.patterns.find(
                        (pattern) => pattern.day === p.day,
                      )?.dates.length ?? 0}{" "}
                      {preparation.data?.patterns.find(
                        (pattern) => pattern.day === p.day,
                      )?.dates.length === 1
                        ? "clase"
                        : "clases"}
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
            {step === 1 && preparation.status !== "ready" && (
              <div role={preparation.error ? "alert" : "status"}>
                <p>
                  {preparation.error ?? "Consultando fechas y disponibilidad…"}
                </p>
                {preparation.error && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={preparation.retry}
                  >
                    Reintentar consulta
                  </Button>
                )}
              </div>
            )}
            {error && (
              <FormError
                message={error}
                fields={[
                  ...(error.includes("Indicá alumnos")
                    ? [{ id: "booking-students", label: "cantidad de alumnos" }]
                    : []),
                ]}
              />
            )}
            <div className="form-actions">
              {step > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
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
                    disabled={response.status !== "ready"}
                    onClick={() => {
                      onPrepare?.({
                        mode: "periodic",
                        students,
                        type,
                        resources,
                        board,
                        patterns,
                        dates: [],
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
                  disabled={
                    saving ||
                    preparation.status !== "ready" ||
                    (step === 2 &&
                      (response.status !== "ready" ||
                        occurrences.some((p) => !p.room)))
                  }
                >
                  {saving
                    ? "Guardando reserva…"
                    : step === 3
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
          {!queryOnly && <p>{visibleCourse}</p>}
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
            {preparation.status !== "ready" ? "—" : occurrences.length}
            <span>
              {occurrences.length === 1 ? "clase prevista" : "clases previstas"}
            </span>
          </p>
          <p>{periodLabels[schedule.period]}</p>
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
