import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ArrowRight } from "lucide-react";
import {
  available,
  datesFor,
  dayNames,
  expand,
  minutes,
  rooms,
  validateBooking,
  type Pattern,
  type Booking,
  dateLabel,
} from "../domain";
import { Button } from "../components/ui/button";

export function Wizard({
  bookings,
  save,
}: {
  bookings: Booking[];
  save: (b: Booking) => void;
}) {
  const go = useNavigate();
  const [step, setStep] = useState(1);
  const [subject, setSubject] = useState("Matemática I");
  const [course, setCourse] = useState("001-A-2026");
  const [teacher, setTeacher] = useState("Laura Gómez");
  const [students, setStudents] = useState(30);
  const [type, setType] = useState("Multimedios");
  const [patterns, setPatterns] = useState<Pattern[]>([
    { day: 1, start: "14:00", end: "16:00", room: "" },
    { day: 3, start: "14:00", end: "16:00", room: "" },
  ]);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<Booking | null>(null);
  const occurrences = expand(patterns);
  const booking = {
    id: `R-${String(bookings.length + 1).padStart(3, "0")}`,
    subject,
    course,
    teacher,
    students,
    occurrences,
  };
  function update(day: number, patch: Partial<Pattern>) {
    setPatterns((p) => p.map((x) => (x.day === day ? { ...x, ...patch } : x)));
  }
  function next(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (
      !patterns.length ||
      patterns.some((p) => minutes(p.start) >= minutes(p.end))
    ) {
      setError(
        "Seleccioná al menos un día y un horario de inicio anterior al final.",
      );
      return;
    }
    if (step === 1) {
      setPatterns((current) =>
        current.map((pattern) => {
          const room = rooms.find((candidate) => candidate.id === pattern.room);
          return room &&
            room.capacity >= students &&
            room.type === type &&
            available(pattern, room.id, bookings)
            ? pattern
            : { ...pattern, room: "" };
        }),
      );
      setStep(2);
      return;
    }
    const issue = validateBooking(booking, bookings);
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
          <p className="eyebrow">ORGANIZAR EL CUATRIMESTRE</p>
          <h1>Nueva reserva periódica</h1>
        </div>
        <Button variant="ghost" onClick={() => go("/agenda")}>
          Salir
        </Button>
      </div>
      <ol className="steps">
        {["Datos y horarios", "Elegir aulas", "Revisar y confirmar"].map(
          (s, i) => (
            <li
              key={s}
              aria-current={step === i + 1 ? "step" : undefined}
              className={step >= i + 1 ? "current" : ""}
            >
              <span>{i + 1}</span>
              {s}
            </li>
          ),
        )}
      </ol>
      <form onSubmit={next} className="wizard">
        <div>
          <section className="panel">
            <h2>
              {step === 1
                ? "Datos de la reserva"
                : step === 2
                  ? "Un aula para cada día semanal"
                  : "Todo listo para revisar"}
            </h2>
            <p className="muted">
              {step === 1
                ? "Reuní los datos de la clase y definí su frecuencia."
                : step === 2
                  ? "El aula elegida se mantiene en todas las clases de ese día durante el cuatrimestre."
                  : "La disponibilidad se verifica nuevamente al confirmar."}
            </p>
            {step === 1 ? (
              <>
                <div className="form-grid">
                  <label>
                    Materia
                    <input
                      required
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    />
                  </label>
                  <label>
                    Curso
                    <input
                      required
                      pattern="[0-9]{3}-[A-Z0-9]+-2026"
                      title="Formato: 001-A-2026"
                      value={course}
                      onChange={(e) => setCourse(e.target.value)}
                    />
                  </label>
                  <label>
                    Docente
                    <select
                      value={teacher}
                      onChange={(e) => setTeacher(e.target.value)}
                    >
                      {[
                        "Laura Gómez",
                        "Ana Ruiz",
                        "Martín Díaz",
                        "Sofía Paz",
                        "Diego Luna",
                      ].map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </label>
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
                      onChange={(e) => setType(e.target.value)}
                    >
                      {["Multimedios", "General", "Laboratorio"].map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Período
                    <input readOnly value="2.º cuatrimestre · 2026" />
                  </label>
                </div>
                <div className="section-divider">
                  <h2>Días y horarios</h2>
                  <p className="muted">
                    14 de septiembre al 18 de diciembre de 2026
                  </p>
                  <div className="weekdays">
                    {[1, 2, 3, 4, 5].map((day) => (
                      <label
                        key={day}
                        className={
                          patterns.some((p) => p.day === day) ? "selected" : ""
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
                            update(p.day, { start: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        Hasta
                        <input
                          type="time"
                          min="07:30"
                          max="23:00"
                          step="1800"
                          required
                          value={p.end}
                          onChange={(e) =>
                            update(p.day, { end: e.target.value })
                          }
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </>
            ) : step === 2 ? (
              patterns.map((p) => (
                <fieldset className="room-options" key={p.day}>
                  <legend>
                    {dayNames[p.day]} · {p.start}–{p.end}{" "}
                    <small>{datesFor(p.day).length} clases</small>
                  </legend>
                  {rooms
                    .filter(
                      (r) =>
                        r.capacity >= students &&
                        r.type === type &&
                        available(p, r.id, bookings),
                    )
                    .map((r) => (
                      <label
                        className={
                          p.room === r.id
                            ? "room-option selected"
                            : "room-option"
                        }
                        key={r.id}
                      >
                        <input
                          type="radio"
                          name={`room-${p.day}`}
                          required
                          checked={p.room === r.id}
                          onChange={() => update(p.day, { room: r.id })}
                        />
                        <div>
                          <strong>Aula {r.id}</strong>
                          <small>
                            {r.capacity} personas · {r.type}
                          </small>
                        </div>
                        <span className="availability">
                          Disponible todo el período
                        </span>
                      </label>
                    ))}
                  {!rooms.some(
                    (r) =>
                      r.capacity >= students &&
                      r.type === type &&
                      available(p, r.id, bookings),
                  ) && (
                    <p className="error">
                      No hay aulas disponibles durante todo el período. Volvé
                      para ajustar los criterios. El ranking informativo de
                      conflictos se incorporará en el próximo subcorte.
                    </p>
                  )}
                </fieldset>
              ))
            ) : (
              <>
                <div className="review-data">
                  <h3>
                    {subject} <small>{course}</small>
                  </h3>
                  <p>
                    {teacher} · {students} alumnos previstos
                  </p>
                  {patterns.map((p) => (
                    <p key={p.day}>
                      <strong>{dayNames[p.day]}</strong> · {p.start}–{p.end} ·
                      Aula {p.room} · {datesFor(p.day).length} clases
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
              <Button type="submit">
                {step === 3
                  ? "Confirmar reserva"
                  : step === 2
                    ? "Revisar reserva"
                    : "Buscar aulas"}
                <ArrowRight />
              </Button>
            </div>
          </section>
        </div>
        <aside className="panel summary">
          <p className="eyebrow">TU RESERVA</p>
          <h2>{subject || "Nueva clase"}</h2>
          <p>{course}</p>
          <hr />
          <p>{teacher}</p>
          <p>{students} alumnos previstos</p>
          <p>{type}</p>
          <hr />
          <p className="big-number">
            {occurrences.length}
            <span>clases previstas</span>
          </p>
          <p>2.º cuatrimestre 2026</p>
          <p className="muted">
            Se omiten los feriados del 12 de octubre y 23 de noviembre.
          </p>
        </aside>
      </form>
    </>
  );
}
