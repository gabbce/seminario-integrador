import { expect, it } from "vitest";
import { listingRows, type ListFilters } from "./listing";
import { initialBookings } from "./domain";
const filters: ListFilters = {
  mode: "day",
  date: "2026-09-14",
  course: "",
  type: "",
  room: "",
  status: "active",
};
it("filtra ocurrencias canceladas sin usar el estado de cabecera", () => {
  const booking = {
    ...initialBookings[0],
    occurrences: [
      { ...initialBookings[0].occurrences[0], cancelled: true },
      { ...initialBookings[0].occurrences[0], date: "2026-09-15" },
    ],
  };
  expect(listingRows([booking], filters)).toHaveLength(0);
  expect(
    listingRows([booking], { ...filters, status: "cancelled" }),
  ).toHaveLength(1);
  expect(
    listingRows([booking], {
      ...filters,
      mode: "course",
      course: booking.course,
      status: "all",
    }),
  ).toHaveLength(2);
});
it("mantiene todos los resultados para impresión y agrupa por tipo", () => {
  const bookings = Array.from({ length: 25 }, (_, i) => ({
    ...initialBookings[i % 4],
    id: `R-${i}`,
  }));
  expect(listingRows(bookings, filters)).toHaveLength(25);
  expect(
    listingRows(bookings, { ...filters, room: "108" }).every(
      (r) => r.occurrence.room === "108",
    ),
  ).toBe(true);
});

it("conserva el tipo registrado cuando cambia el inventario", () => {
  const booking = {
    ...initialBookings[3],
    type: "Laboratorio",
    occurrences: initialBookings[3].occurrences.map((o) => ({
      ...o,
      cancelled: true,
    })),
  };
  const rows = listingRows(
    [booking],
    {
      mode: "day",
      date: "2026-09-14",
      course: "",
      room: "",
      type: "Laboratorio",
      status: "cancelled",
    },
    [{ id: "Lab 2", type: "General", capacity: 24 }],
  );
  expect(rows).toHaveLength(1);
  expect(rows[0].type).toBe("Laboratorio");
});
