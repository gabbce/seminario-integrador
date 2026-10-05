import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const lines = readFileSync("../backend/.env", "utf8").split(/\r?\n/);
const password =
  process.env.AULAS_DEMO_PASSWORD ||
  lines
    .find((l) => l.startsWith("AULAS_DEMO_PASSWORD="))
    ?.slice("AULAS_DEMO_PASSWORD=".length)
    .replaceAll("\\\\", "\\");
if (!password) throw Error("Configurar AULAS_DEMO_PASSWORD localmente.");
type Occurrence = {
  date: string;
  originalDate?: string;
  start: string;
  room: string;
  cancelled: boolean;
  cancellation?: { actor?: string };
};
type Booking = {
  id: string;
  subject: string;
  occurrences: Occurrence[];
  patterns?: { day: number; room: string }[];
  state: string;
  continuityCancelledAt?: string;
  teacherEmail?: string;
  registrant?: unknown;
  changes?: unknown;
};
// Read-only: requires the explicit seed-operacion-i04 command, never resets shared QA.
test("I04 dataset integrado real y privacidad entre sesiones", async ({
  page,
  browser,
}) => {
  test.setTimeout(300000);
  await page.goto("/");
  await page.getByLabel("Correo electrónico").fill("bedel@demo.local");
  await page.getByLabel("Contraseña", { exact: true }).fill(password!);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page.getByLabel("Fecha de agenda")).toBeVisible();
  const bookings: Booking[] = await page.evaluate(async () => {
    const session = JSON.parse(localStorage.getItem("aulas-auth")!);
    const r = await fetch("/api/reservas", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!r.ok) throw Error(`QA lectura ${r.status}`);
    return r.json();
  });
  for (const id of ["15", "16", "17", "18", "19", "20", "21", "22", "23"]) expect(bookings.some(b => b.id === id)).toBe(true);
  const scenario = (date: string, start = "07:00") => {
    const found = bookings.filter(
      (b) =>
        b.subject === "Historia" &&
        b.occurrences.some((o) => o.date === date && o.start === start),
    );
    expect(found).toHaveLength(1);
    return found[0];
  };
  const rest = scenario("2027-07-14"),
    partial = scenario("2027-07-22"),
    total = scenario("2026-10-06"),
    rooms = scenario("2027-08-24"),
    sporadic = scenario("2027-08-18"),
    periodic = scenario("2027-03-17"),
    cese = scenario("2026-09-17"),
    annual = scenario("2027-03-10", "08:00");
  expect(rest.occurrences).toHaveLength(2);
  expect(partial.occurrences.filter((o) => o.cancelled)).toHaveLength(1);
  expect(total.state).toBe("CANCELADA");
  expect(rooms.occurrences.every((o) => o.room === "105")).toBe(true);
  expect(sporadic.occurrences[0].originalDate).toBe("2027-08-17");
  expect(
    periodic.occurrences.find((o) => o.date === "2027-03-17")?.originalDate,
  ).toBe("2027-03-16");
  expect(periodic.patterns).toMatchObject([{ day: 2, room: "105" }]);
  expect(periodic.occurrences.some((o) => o.date === "2027-03-23")).toBe(false);
  expect(cese.continuityCancelledAt).toBeTruthy();
  expect(cese.occurrences.every((o) => o.cancelled)).toBe(true);
  expect(annual.occurrences).toHaveLength(31);
  const all = [rest, partial, total, rooms, sporadic, periodic, cese, annual];
  expect(new Set(all.map((b) => b.id)).size).toBe(8);
  expect(all.flatMap((b) => b.occurrences)).toHaveLength(69);
  expect(
    all.flatMap((b) => b.occurrences).filter((o) => o.cancelled),
  ).toHaveLength(18);
  await page.goto(`/reservas/${periodic.id}`);
  await expect(
    page.getByRole("heading", { name: "Historial de cambios" }),
  ).toBeVisible();
  await page.screenshot({
    path: "../artifacts/qa/screens/i046-real-periodic-1440.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.goto(`/reservas/${partial.id}`);
  await expect(
    page.getByText(/Cancelación ficticia del conjunto I-04/),
  ).toBeVisible();
  await page.screenshot({
    path: "../artifacts/qa/screens/i046-real-partial-390.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const second = await browser.newPage({
    viewport: { width: 390, height: 1000 },
  });
  try {
    await second.goto("/");
    await second.getByLabel("Correo electrónico").fill("docente@demo.local");
    await second.getByLabel("Contraseña", { exact: true }).fill(password!);
    await second.getByRole("button", { name: "Ingresar", exact: true }).click();
    await expect(second.getByLabel("Fecha de agenda")).toBeVisible();
    const response = second.waitForResponse((r) =>
      r.url().endsWith(`/api/reservas/${periodic.id}`),
    );
    await second.goto(`/reservas/${periodic.id}`);
    const data: Booking = await (await response).json();
    expect(
      data.occurrences.map((o) => [
        o.date,
        o.room,
        o.originalDate,
        o.cancelled,
      ]),
    ).toEqual(
      periodic.occurrences.map((o) => [
        o.date,
        o.room,
        o.originalDate,
        o.cancelled,
      ]),
    );
    expect(data).not.toHaveProperty("teacherEmail");
    expect(data).not.toHaveProperty("registrant");
    expect(data).not.toHaveProperty("changes");
    expect(
      data.occurrences.every(
        (o) => !o.cancellation || !("actor" in o.cancellation),
      ),
    ).toBe(true);
    await expect(
      second.getByRole("heading", { name: "Historia", exact: true }),
    ).toBeVisible();
    await expect(
      second.getByRole("button", { name: "Reprogramar clases" }),
    ).toHaveCount(0);
    await second.screenshot({
      path: "../artifacts/qa/screens/i046-real-docente-390.png",
      fullPage: true,
    });
    console.log(
      `I04 dataset verificado: receso=${rest.id}, parcial=${partial.id}, total=${total.id}, aulas=${rooms.id}, origen-esporádica=${sporadic.id}, patrón-reprogramado=${periodic.id}, cese=${cese.id}, anual=${annual.id}; 69 clases, 18 canceladas; QA previa conservada.`,
    );
  } finally {
    await second.close();
  }
});
