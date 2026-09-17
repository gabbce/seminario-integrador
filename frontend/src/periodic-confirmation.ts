import type { Booking } from "./domain";
import { api } from "./api";
export type ConfirmationRequest = {
  operationId: string;
  proposal: Record<string, unknown>;
  teacherId: string;
  calendarVersion: number;
  selections: {
    day: number;
    roomId: string;
    roomVersion: number;
    dates: string[];
  }[];
};
export const confirmPeriodic = (request: ConfirmationRequest) =>
  api<Booking>("/reservas/periodicas/confirmacion", {
    method: "POST",
    body: JSON.stringify(request),
  });
export const operationResult = (key: string) =>
  api<{ found: boolean; booking?: Booking }>(`/reservas/operaciones/${key}`);
