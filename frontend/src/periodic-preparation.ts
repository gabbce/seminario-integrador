import { useEffect, useState } from "react";
import { api } from "./api";
import type { Room } from "./domain";

export type PreparedPattern = {
  day: number;
  start: string;
  end: string;
  dates: string[];
  omitted: { date: string; reason: string }[];
  availableRooms: Room[];
  compatibleCount: number;
};
export type PeriodicPreparation = {
  year: number;
  calendarVersion: number;
  patterns: PreparedPattern[];
};
export function usePeriodicPreparation(request: string | null) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    key: string | null;
    attempt: number;
    data?: PeriodicPreparation;
    error?: string;
  }>();
  useEffect(() => {
    if (!request) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api<PeriodicPreparation>("/reservas/periodicas/preparacion", {
        method: "POST",
        body: request,
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(30000),
        ]),
      }).then(
        (data) => {
          if (!controller.signal.aborted)
            setResult({ key: request, attempt, data });
        },
        (error: unknown) => {
          if (!controller.signal.aborted)
            setResult({
              key: request,
              attempt,
              error:
                error instanceof Error
                  ? error.message
                  : "No pudimos consultar la disponibilidad.",
            });
        },
      );
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [request, attempt]);
  const current =
    result?.key === request && result?.attempt === attempt ? result : undefined;
  return {
    data: current?.data,
    error: current?.error,
    status: current?.error ? "error" : current?.data ? "ready" : "loading",
    retry: () => setAttempt((value) => value + 1),
  };
}
