import { useState } from "react";
import { createCourse, type Course } from "../catalog";
import { Button } from "./ui/button";
export function CoursePicker({
  courses,
  selected,
  choose,
  add,
}: {
  courses: Course[];
  selected: string;
  choose: (course: Course) => void;
  add: (course: Course) => void;
}) {
  const [editing, setEditing] = useState(false),
    [subject, setSubject] = useState(""),
    [commission, setCommission] = useState(""),
    [error, setError] = useState("");
  function create() {
    try {
      const course = createCourse(courses, subject, commission, 2026);
      add(course);
      choose(course);
      setEditing(false);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Revisá los datos.");
    }
  }
  return (
    <div className="course-picker">
      <label>
        Curso
        <select
          aria-label="Curso"
          value={selected}
          onChange={(e) => {
            const course = courses.find((c) => c.id === e.target.value);
            if (course) choose(course);
          }}
        >
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.subject} · {c.id}
            </option>
          ))}
        </select>
      </label>
      <Button
        type="button"
        variant="ghost"
        onClick={() => setEditing(!editing)}
      >
        {editing ? "Cerrar creación" : "Crear curso"}
      </Button>
      {editing && (
        <section className="course-create" aria-label="Crear curso">
          <p className="muted">
            El código de materia se genera y se reutiliza para sus comisiones.
          </p>
          <label>
            Nombre de materia
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              list="matter-names"
            />
          </label>
          <datalist id="matter-names">
            {[...new Set(courses.map((c) => c.subject))].map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <label>
            Comisión
            <input
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
            />
          </label>
          <p>Año lectivo: 2026</p>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <Button type="button" onClick={create}>
            Guardar curso y seleccionar
          </Button>
        </section>
      )}
    </div>
  );
}
