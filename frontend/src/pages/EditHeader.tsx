import { FormError, FieldError } from "../components/FormError";
import { useRooms } from "../room-context";
import { useState } from "react";
import { type Booking } from "../domain";
import { type Course } from "../catalog";
import { type HeaderChange } from "../booking-header";
import { CoursePicker } from "../components/CoursePicker";
import { teachers } from "../teachers";
import { resourceLabels, resourcesFor } from "../equipment";
import { Button } from "../components/ui/button";
export function EditHeader({
  booking,
  courses,
  addCourse,
  save,
  back,
}: {
  booking: Booking;
  courses: Course[];
  addCourse: (c: Course) => void;
  save: (request: HeaderChange) => string | undefined;
  back: () => void;
}) {
  const rooms = useRooms();
  const [request, setRequest] = useState<HeaderChange>({
    version: booking.version ?? 0,
    course: booking.course,
    teacher: booking.teacher,
    students: booking.students,
    type:
      booking.type ??
      rooms.find((r) => r.id === booking.occurrences[0]?.room)?.type ??
      "General",
    resources: booking.resources ?? [],
    board: booking.board ?? "",
  });
  const [error, setError] = useState("");
  function patch(p: Partial<HeaderChange>) {
    setRequest((old) => ({ ...old, ...p }));
    setError("");
  }
  return (
    <>
      <Button variant="ghost" onClick={back}>
        Volver al detalle
      </Button>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{booking.id} · Datos compartidos</p>
          <h1>Modificar datos de la reserva</h1>
          <p>
            Los cambios se aplican a toda la reserva antes de su primera clase.
          </p>
        </div>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const failure = save(request);
          if (failure) setError(failure);
        }}
      >
        <div className="cancellation-layout">
          <section className="panel">
            <h2>Curso y docente</h2>
            <CoursePicker
              year={Number(booking.occurrences[0]?.date.slice(0, 4))}
              courses={courses}
              selected={request.course}
              choose={(c) => patch({ course: c.id })}
              add={addCourse}
            />
            <div className="form-grid">
              <label>
                Docente
                <select
                  aria-label="Docente"
                  value={request.teacher}
                  onChange={(e) => patch({ teacher: e.target.value })}
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Alumnos previstos
                <input
                  id="header-students"
                  aria-label="Alumnos previstos"
                  aria-invalid={
                    error.includes("cantidad entera positiva") || undefined
                  }
                  aria-describedby={
                    error.includes("cantidad entera positiva")
                      ? "header-students-error"
                      : undefined
                  }
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={request.students}
                  onChange={(e) => patch({ students: Number(e.target.value) })}
                />
                <FieldError
                  id="header-students-error"
                  message={
                    error.includes("cantidad entera positiva") ? error : ""
                  }
                />
              </label>
            </div>
            <h2>Requisitos de aula</h2>
            <div className="form-grid">
              <label>
                Tipo de aula
                <select
                  aria-label="Tipo de aula"
                  value={request.type}
                  onChange={(e) =>
                    patch({
                      type: e.target.value,
                      resources: request.resources.filter((r) =>
                        resourcesFor(e.target.value).includes(r),
                      ),
                    })
                  }
                >
                  {["General", "Multimedios", "Laboratorio"].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label>
                Pizarrón
                <select
                  aria-label="Pizarrón"
                  value={request.board}
                  onChange={(e) => patch({ board: e.target.value })}
                >
                  <option value="">Sin preferencia</option>
                  <option>Tiza</option>
                  <option>Fibrón</option>
                </select>
              </label>
            </div>
            <fieldset className="header-resources">
              <legend>Equipamiento solicitado</legend>
              {resourcesFor(request.type).map((r) => (
                <label key={r}>
                  <input
                    type="checkbox"
                    checked={request.resources.includes(r)}
                    onChange={(e) =>
                      patch({
                        resources: e.target.checked
                          ? [...request.resources, r]
                          : request.resources.filter((v) => v !== r),
                      })
                    }
                  />
                  {resourceLabels[r]}
                </label>
              ))}
            </fieldset>
          </section>
          <aside className="panel">
            <h2>Alcance del cambio</h2>
            <p>Clases registradas: {booking.occurrences.length}</p>
            <p>
              Se conservan fechas, horarios y aulas. Se comprobará que todas las
              aulas de clases vigentes cumplan los nuevos requisitos.
            </p>
            <h2>Datos actuales</h2>
            <p>
              {booking.subject} · {booking.course}
            </p>
            <p>
              {booking.teacher} · {booking.students} alumnos previstos
            </p>
            <p>
              Una vez iniciada la reserva, estos datos quedan fijos para
              preservar el historial.
            </p>
            {error && (
              <FormError
                message={error}
                fields={[
                  ...(error.includes("cantidad entera positiva")
                    ? [{ id: "header-students", label: "alumnos previstos" }]
                    : []),
                ]}
              />
            )}
          </aside>
        </div>
        <div className="change-room-actions">
          <Button type="button" variant="outline" onClick={back}>
            Descartar cambios
          </Button>
          <Button type="submit">Guardar datos</Button>
        </div>
      </form>
    </>
  );
}
