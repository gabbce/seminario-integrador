import { PersistedHeader } from "./PersistedHeader";
import type { Course } from "../catalog";
import { PersistedCancellation } from "./PersistedCancellation";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import type { Booking, Role } from "../domain";
import { Detail } from "./Detail";
import { Button } from "../components/ui/button";
export function PersistedDetail({
  role,
  actorId,
  courses,
  addCourse,
}: {
  role: Role;
  actorId: string;
  courses: Course[];
  addCourse: (c: Course) => void;
}) {
  const { id } = useParams();
  const storageKey = `aulas-cancellation:${actorId}:${id}`;
  const headerKey = `aulas-header:${actorId}:${id}`;
  const [editingHeader, setEditingHeader] = useState(
    () => !!sessionStorage.getItem(headerKey),
  );
  const [cancelling, setCancelling] = useState(
    () => !!sessionStorage.getItem(storageKey),
  );
  const [attempt, retry] = useState(0);
  const [result, setResult] = useState<{
    id?: string;
    booking?: Booking;
    error?: string;
  }>();
  useEffect(() => {
    let active = true;
    api<Booking>(`/reservas/${id}`).then(
      (booking) => {
        if (active) setResult({ id, booking });
      },
      (error: Error) => {
        if (active) setResult({ id, error: error.message });
      },
    );
    return () => {
      active = false;
    };
  }, [id, attempt]);
  if (!result || result.id !== id)
    return <p role="status">Cargando reserva…</p>;
  if (result.error)
    return (
      <section className="panel" role="alert">
        <p>{result.error}</p>
        <Button
          onClick={() => {
            setResult(undefined);
            retry((old) => old + 1);
          }}
        >
          Reintentar consulta
        </Button>
      </section>
    );
  if (!result.booking) return null;
  if (cancelling && role !== "Docente")
    return (
      <PersistedCancellation
        key={storageKey}
        booking={result.booking}
        storageKey={storageKey}
        back={() => {
          setCancelling(false);
          setResult(undefined);
          retry((old) => old + 1);
        }}
      />
    );
  if (editingHeader && role !== "Docente")
    return (
      <PersistedHeader
        booking={result.booking}
        storageKey={headerKey}
        courses={courses}
        addCourse={addCourse}
        back={() => {
          setEditingHeader(false);
          setResult(undefined);
          retry((old) => old + 1);
        }}
      />
    );
  return (
    <Detail
      editHeaderPersisted={() => setEditingHeader(true)}
      cancelPersisted={() => setCancelling(true)}
      readOnly
      bookings={[result.booking]}
      role={role}
      courses={[]}
      addCourse={() => {}}
      changeHeader={() => undefined}
      changeRoom={() => undefined}
      reschedule={() => undefined}
      cancel={() => undefined}
    />
  );
}
