import { useLayoutEffect, useRef, useState } from "react";
import { createPortal, flushSync } from "react-dom";
import { Printer } from "lucide-react";
import { api } from "../api";
import {
  institutionalNow,
  institutionalTimestamp,
} from "../institutional-time";
import type { ConsultationResult } from "../consultations";
import { dateLabel } from "../domain";
import { Button } from "./ui/button";

export function PrintDaily({
  date,
  room,
  type,
  status,
}: {
  date: string;
  room: string;
  type: string;
  status: string;
}) {
  const key = new URLSearchParams({ date, room, type, status }).toString();
  const active = useRef(true);
  const criteria = useRef(key);
  useLayoutEffect(() => {
    criteria.current = key;
  }, [key]);
  const [snapshot, setSnapshot] = useState<{
    key: string;
    data: ConsultationResult;
    obtainedAt: string;
  }>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  useLayoutEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  async function print() {
    if (pending) return;
    setPending(true);
    setError("");
    setSnapshot(undefined);
    try {
      const data = await api<ConsultationResult>(
        `/consultas/impresion-diaria?${key}`,
      );
      if (!active.current || criteria.current !== key) return;
      if (
        !Array.isArray(data.rows) ||
        data.total !== data.rows.length ||
        new Set(data.rows.map((r) => r.id)).size !== data.total
      )
        throw Error("El listado está incompleto. Reintentá la impresión.");
      flushSync(() =>
        setSnapshot({ key, data, obtainedAt: institutionalNow() }),
      );
      window.print();
    } catch (e) {
      if (active.current && criteria.current === key)
        setError(
          e instanceof Error ? e.message : "No se pudo preparar la impresión.",
        );
    } finally {
      if (active.current) setPending(false);
    }
  }
  const ready = snapshot?.key === key ? snapshot.data : undefined;
  return (
    <>
      <div>
        <Button
          variant="outline"
          onClick={() => void print()}
          disabled={pending}
        >
          <Printer />
          {pending ? "Preparando listado completo…" : "Imprimir listado diario"}
        </Button>
        {error && (
          <p role="alert">{error} Volvé a pulsar imprimir para reintentar.</p>
        )}
      </div>
      {createPortal(
        <section className="print-list" aria-label="Listado diario completo">
          {ready ? (
            <>
              <h1>Reservas · {dateLabel(date)}</h1>
              <p>
                Consultado: {institutionalTimestamp(snapshot!.obtainedAt)}.
                Volvé a usar «Imprimir listado diario» para actualizar los
                datos.
              </p>
              <p>
                Tipo: {type || "Todos"} · Aula: {room || "Todas"} · Estado:{" "}
                {status === "all"
                  ? "Todas"
                  : status === "cancelled"
                    ? "Canceladas"
                    : "Confirmadas"}
              </p>
              <p>{ready.total} resultados</p>
              <table>
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Fecha</th>
                    <th>Horario</th>
                    <th>Aula</th>
                    <th>Curso y docente</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {ready.rows.map((r) => (
                    <tr key={r.id} data-occurrence-id={r.id}>
                      <td>{r.type}</td>
                      <td>{dateLabel(r.date)}</td>
                      <td>
                        {r.start}–{r.end}
                      </td>
                      <td>{r.room}</td>
                      <td>
                        <strong>{r.subject}</strong>
                        <small>
                          {r.course} · {r.teacher}
                        </small>
                      </td>
                      <td>{r.cancelled ? "Cancelada" : "Confirmada"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p>
              Listado no preparado. Usá «Imprimir listado diario» y esperá la
              carga completa antes de imprimir.
            </p>
          )}
        </section>,
        document.body,
      )}
    </>
  );
}
