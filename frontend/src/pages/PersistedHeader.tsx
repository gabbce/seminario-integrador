import { useState } from "react";
import { api, ApiError } from "../api";
import type { Booking } from "../domain";
import type { Course } from "../catalog";
import type { HeaderChange } from "../booking-header";
import { useTeachers } from "../teacher-context";
import { EditHeader } from "./EditHeader";
import { Button } from "../components/ui/button";
import { FormError } from "../components/FormError";

type Request = {
  operationId: string;
  version: number;
  courseId: string;
  teacherId: string;
  students: number;
  type: string;
  board: string;
  resources: string[];
};
type Pending = { request: Request; form: HeaderChange };
type Result = {
  operationId: string;
  reservationId: string;
  version: number;
  at: string;
};
export function PersistedHeader({
  booking,
  storageKey,
  courses,
  addCourse,
  back,
}: {
  booking: Booking;
  storageKey: string;
  courses: Course[];
  addCourse: (c: Course) => void;
  back: () => void;
}) {
  const teachers = useTeachers();
  const [initial] = useState<Pending | undefined>(() => {
    const value = sessionStorage.getItem(storageKey);
    return value ? JSON.parse(value) : undefined;
  });
  const [pending, setPending] = useState<Pending | undefined>(initial);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(
    initial
      ? "Hay una modificación pendiente de comprobar. Consultá el resultado o reintentá la misma operación."
      : "",
  );
  const [formError, setFormError] = useState("");
  function success() {
    sessionStorage.removeItem(storageKey);
    setPending(undefined);
    setDone(true);
    setError("");
  }
  async function confirm(value: Pending): Promise<string | undefined> {
    if (busy) return;
    setBusy(true);
    setError("");
    setFormError("");
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(value));
      setPending(value);
      const result = await api<Result>(`/reservas/${booking.id}/cabecera`, {
        method: "POST",
        body: JSON.stringify(value.request),
      });
      if (result?.operationId !== value.request.operationId)
        throw new Error("Respuesta no reconocida");
      success();
    } catch (e) {
      if (e instanceof ApiError && [400, 403, 404, 409].includes(e.status)) {
        sessionStorage.removeItem(storageKey);
        setPending(undefined);
        setFormError(e.message);
        return e.message;
      }
      setError(
        "No se pudo comprobar el resultado. Conservamos los datos y la misma operación para consultar o reintentar.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function recover() {
    if (!pending) return;
    setBusy(true);
    setError("");
    try {
      const data = await api<{ found: boolean; result?: Result }>(
        `/reservas/mutaciones/${pending.request.operationId}`,
      );
      if (
        data.found &&
        data.result?.operationId === pending.request.operationId
      )
        success();
      else
        setError(
          "Todavía no hay resultado confirmado. Esto no demuestra que haya fallado: reintentá la misma operación.",
        );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (done)
    return (
      <section className="panel" role="status">
        <h1>Datos de la reserva actualizados</h1>
        <p>Se conservaron las fechas, aulas y el historial.</p>
        <Button onClick={back}>Ver detalle actualizado</Button>
      </section>
    );
  return (
    <>
      <div hidden={!!pending}>
        <EditHeader
          booking={booking}
          courses={courses}
          addCourse={addCourse}
          back={back}
          initial={initial?.form}
          externalError={formError}
          save={async (form) => {
            const teacher = teachers.find((t) => t.name === form.teacher);
            if (!teacher) return "Seleccioná un docente de la lista.";
            return confirm({
              form,
              request: {
                operationId: crypto.randomUUID(),
                version: form.version,
                courseId: form.course,
                teacherId: teacher.id,
                students: form.students,
                type: form.type,
                board: form.board,
                resources: form.resources,
              },
            });
          }}
        />
      </div>
      {pending && (
        <section className="panel">
          <h1>
            {busy ? "Guardando datos de la reserva…" : "Comprobar modificación"}
          </h1>
          <p>
            {booking.subject} · {pending.form.teacher} · {pending.form.students}{" "}
            alumnos previstos
          </p>
          <p>
            Los datos enviados permanecen fijos hasta comprobar el resultado.
          </p>
          {error && <FormError message={error} />}
          <div className="change-room-actions">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void recover()}
            >
              Consultar resultado
            </Button>
            <Button disabled={busy} onClick={() => void confirm(pending)}>
              Reintentar misma modificación
            </Button>
          </div>
        </section>
      )}
    </>
  );
}
