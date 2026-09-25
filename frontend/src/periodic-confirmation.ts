import type { Booking } from "./domain";
import { api } from "./api";
export type ConfirmationRequest = {
  operationId: string;
  proposal: Record<string, unknown>;
  teacherId: string;
  calendarVersion: number;
  selections: ({ roomId: string; roomVersion: number } & (
    { day: number; dates: string[] } | { date: string }
  ))[];
};
export const confirmReservation = (
  request: ConfirmationRequest,
  mode: "periodic" | "sporadic" = "periodic",
) =>
  api<Booking>(
    `/reservas/${mode === "periodic" ? "periodicas" : "esporadicas"}/confirmacion`,
    {
      method: "POST",
      body: JSON.stringify(request),
    },
  );
export const operationResult = (key: string) =>
  api<{ found: boolean; booking?: Booking }>(`/reservas/operaciones/${key}`);
