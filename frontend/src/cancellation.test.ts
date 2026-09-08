import { describe, expect, it } from "vitest";
import { cancelClasses, bookingState } from "./cancellation";
import { initialBookings, type Booking } from "./domain";
const booking: Booking = {
  ...initialBookings[0],
  patterns: [{ day: 1, start: "13:00", end: "14:30", room: "108" }],
  occurrences: [
    { date: "2026-09-07", start: "13:00", end: "14:30", room: "108" },
    ...initialBookings[0].occurrences,
    { date: "2026-09-21", start: "13:00", end: "14:30", room: "108" },
  ],
};
describe("cancelación atómica", () => {
  it("conserva pasado, motivo e intención de cese sin cambiar estado histórico", () => {
    const result = cancelClasses(
      booking,
      { indices: [1, 2], reason: " Receso ", version: 0 },
      "Bedel",
    );
    expect(result.error).toBeUndefined();
    if (!result.booking) throw Error("Falta reserva");
    expect(result.booking.occurrences[0]).toEqual(booking.occurrences[0]);
    expect(result.booking.occurrences[1].cancellation?.reason).toBe("Receso");
    expect(result.booking.continuityCancelledAt).toBeTruthy();
    expect(bookingState(result.booking)).toBe("CONFIRMADA");
    expect(booking.occurrences[1].cancelled).toBeUndefined();
  });
  it("rechaza selección mixta, inicio exacto, versión vieja, docente y motivo vacío", () => {
    const request = { indices: [1], reason: "Cambio", version: 0 };
    expect(
      cancelClasses(booking, { ...request, indices: [0, 1] }, "Bedel").error,
    ).toBeTruthy();
    expect(
      cancelClasses(booking, request, "Bedel", "2026-09-14T13:00").error,
    ).toBeTruthy();
    expect(
      cancelClasses(booking, { ...request, version: 1 }, "Bedel").error,
    ).toBeTruthy();
    expect(cancelClasses(booking, request, "Docente").error).toBeTruthy();
    expect(
      cancelClasses(booking, { ...request, reason: " " }, "Bedel").error,
    ).toBeTruthy();
  });
  it("cancela una clase sin cesar continuidad y prohíbe repetir cancelación", () => {
    const request = { indices: [1], reason: "Cambio", version: 0 };
    const result = cancelClasses(booking, request, "Administrador");
    if (!result.booking) throw Error("Falta reserva");
    expect(result.booking.continuityCancelledAt).toBeUndefined();
    expect(
      cancelClasses(result.booking, { ...request, version: 1 }, "Bedel").error,
    ).toBeTruthy();
    const all = cancelClasses(
      initialBookings[0],
      { ...request, indices: [0] },
      "Bedel",
    );
    expect(all.booking && bookingState(all.booking)).toBe("CANCELADA");
  });
});
