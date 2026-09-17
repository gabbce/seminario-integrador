import type { Booking } from "../src/domain";
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const lines = readFileSync(resolve("../backend/.env"), "utf8").split(/\r?\n/);
const password =
  process.env.AULAS_DEMO_PASSWORD ||
  lines
    .find((line) => line.startsWith("AULAS_DEMO_PASSWORD="))
    ?.slice("AULAS_DEMO_PASSWORD=".length)
    .replaceAll("\\\\", "\\");
if (!password)
  throw new Error("Configurar AULAS_DEMO_PASSWORD en backend/.env.");

test("I-03.1 real: preparación sin guardar y resumen servido por Java", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Correo electrónico").fill("bedel@demo.local");
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Agenda", exact: true }),
  ).toBeVisible();
  await page.goto("/reservas/nueva");
  await page.getByLabel("Año de la reserva").selectOption("2027");
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/reservas/periodicas/preparacion") &&
      r.request().postDataJSON()?.period === "first",
  );
  await page.getByLabel("Período", { exact: true }).selectOption("first");
  const result = await response;
  expect(result.status()).toBe(200);
  const prepared = await result.json();
  const count = prepared.patterns.reduce(
    (sum: number, pattern: { dates: string[] }) => sum + pattern.dates.length,
    0,
  );
  expect(count).toBeGreaterThan(0);
  await expect(page.locator(".big-number")).toContainText(String(count));
  await page.getByRole("button", { name: "Buscar aulas" }).click();
  for (const pattern of prepared.patterns) {
    expect(pattern.availableRooms.length).toBeGreaterThan(0);
    await page.locator(`input[name="room-${pattern.day}"]`).first().check();
  }
  await page.getByRole("button", { name: "Revisar reserva" }).click();
  await expect(
    page.getByText(`Ver las ${count} fechas a registrar`),
  ).toBeVisible();
  await page.screenshot({
    path: "/tmp/i031-real-revision.png",
    fullPage: true,
  });
});

// Explicit opt-in: creates one fictional periodic reservation, preserved for manual QA.
test("I-03.2 real: confirma, recarga y consulta desde otra sesión", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  await page.getByLabel("Correo electrónico").fill("bedel@demo.local");
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Agenda", exact: true }),
  ).toBeVisible();
  await page.goto("/reservas/nueva");
  await page.getByLabel("Año de la reserva").selectOption("2027");
  await page.getByLabel("Período", { exact: true }).selectOption("first");
  for (const input of await page.locator('.pattern input[type="time"]').all())
    await input.fill("07:00");
  await page.getByRole("button", { name: "Buscar aulas" }).click();
  for (const day of [1, 3])
    await page.locator(`input[name="room-${day}"]`).first().check();
  await page.getByRole("button", { name: "Revisar reserva" }).click();
  const response = page.waitForResponse((r) =>
    r.url().endsWith("/api/reservas/periodicas/confirmacion"),
  );
  await page
    .getByRole("button", { name: "Confirmar reserva", exact: true })
    .click();
  const result = await response;
  expect(result.ok()).toBe(true);
  const booking = await result.json();
  await expect(
    page.getByRole("heading", { name: "Reserva confirmada" }),
  ).toBeVisible();
  await page.screenshot({ path: "/tmp/i032-real-exito.png", fullPage: true });
  await page.getByRole("button", { name: "Ver detalle", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/reservas/${booking.id}$`));
  await page.reload();
  await expect(
    page.getByRole("heading", { name: booking.subject, exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "/tmp/i032-real-detalle.png", fullPage: true });
  const second = await browser.newPage();
  try {
    await second.goto("/");
    await second.getByLabel("Correo electrónico").fill("docente@demo.local");
    await second.getByLabel("Contraseña", { exact: true }).fill(password);
    await second.getByRole("button", { name: "Ingresar", exact: true }).click();
    await expect(
      second.getByRole("link", { name: "Agenda", exact: true }),
    ).toBeVisible();
    const read = second.waitForResponse((r) =>
      r.url().endsWith(`/api/reservas/${booking.id}`),
    );
    await second.goto(`/reservas/${booking.id}`);
    const visible = await (await read).json();
    expect(visible).not.toHaveProperty("teacherEmail");
    expect(visible).not.toHaveProperty("registrant");
    await expect(
      second.getByRole("heading", { name: booking.subject, exact: true }),
    ).toBeVisible();
    await second.goto("/agenda");
    await second
      .getByLabel("Fecha de agenda")
      .fill(booking.occurrences[0].date);
    await expect(
      second.getByText(booking.subject, { exact: true }).first(),
    ).toBeVisible();
    await second
      .getByText(booking.subject, { exact: true })
      .first()
      .scrollIntoViewIfNeeded();
    await second.screenshot({
      path: "/tmp/i032-real-agenda-docente.png",
      fullPage: true,
    });
  } finally {
    await second.close();
  }
});

test("Reservas real: agenda de una reserva existente", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Correo electrónico").fill("docente@demo.local");
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  const list = page.waitForResponse((r) => r.url().endsWith("/api/reservas"));
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  const bookings = await (await list).json();
  expect(bookings.length).toBeGreaterThan(0);
  const booking = bookings[0];
  await expect(page.getByLabel("Fecha de agenda")).toBeVisible();
  await page.getByLabel("Fecha de agenda").fill(booking.occurrences[0].date);
  await page
    .getByLabel("Filtrar aula", { exact: true })
    .selectOption(booking.occurrences[0].room);
  const event = page.getByText(booking.subject, { exact: true }).first();
  await event.scrollIntoViewIfNeeded();
  await expect(event).toBeVisible();
  await page.screenshot({
    path: "/tmp/i032-real-agenda-docente.png",
    fullPage: true,
  });
});

// Read-only, after the explicit I-03 demo load. It preserves every record.
test("I-03.4 real: dataset, alternativas y privacidad con Supabase", async ({
  page,
  browser,
}) => {
  test.setTimeout(180000);
  await page.goto("/");
  await page.getByLabel("Correo electrónico").fill("bedel@demo.local");
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  const list = page.waitForResponse((r) => r.url().endsWith("/api/reservas"));
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  const bookings = await (await list).json();
  const expected = [
    ["Matemática I", 2026, "second", 25, "14:00", "105"],
    ["Física I", 2026, "second", 28, "17:00", "108"],
    ["Programación I", 2026, "second", 26, "18:00", "Lab 2"],
    ["Inglés técnico", 2026, "second", 14, "09:00", "106"],
    ["Matemática I", 2027, "first", 32, "09:00", "105"],
    ["Física I", 2027, "first", 33, "17:00", "108"],
    ["Programación I", 2027, "first", 16, "14:00", "Lab1"],
    ["Bases de datos", 2027, "first", 16, "15:30", "Lab 2"],
    ["Historia", 2027, "annual", 60, "18:00", "101"],
    ["Estadística", 2027, "annual", 58, "10:00", "203"],
    ["Química", 2027, "annual", 31, "14:00", "201"],
    ["Sistemas operativos", 2027, "annual", 31, "18:00", "Lab 2"],
  ] as const;
  for (const [subject, year, period, count, start, room] of expected) {
    const booking = bookings.find(
      (b: Booking) =>
        b.subject === subject &&
        b.schedule?.year === year &&
        b.schedule?.period === period &&
        b.patterns?.some((p) => p.start === start && p.room === room),
    );
    expect(booking, `${subject} ${year} ${period}`).toBeDefined();
    expect(booking.occurrences).toHaveLength(count);
  }
  await page.goto("/agenda?fecha=2026-09-21");
  await page.getByLabel("Filtrar aula", { exact: true }).selectOption("105");
  await page
    .getByText("Matemática I", { exact: true })
    .first()
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "/tmp/i034-real-agenda-2026.png",
    fullPage: true,
  });
  const annual = bookings.find(
    (b: Booking) =>
      b.subject === "Estadística" &&
      b.schedule?.year === 2027 &&
      b.schedule.period === "annual",
  );
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(`/reservas/${annual.id}`);
  await expect(
    page.getByRole("heading", { name: "Estadística", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("58 clases registradas", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/i034-real-anual-390.png",
    fullPage: false,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/disponibilidad");
  await page.getByLabel("Año de la reserva").selectOption("2027");
  await page.getByLabel("Período", { exact: true }).selectOption("first");
  await page.getByLabel("Cantidad de alumnos prevista").fill("24");
  await page
    .getByRole("combobox", { name: "Tipo de aula", exact: true })
    .selectOption("Laboratorio");
  for (const input of await page
    .locator('.equipment input[type="checkbox"]:checked')
    .all())
    await input.uncheck();
  await page
    .getByRole("checkbox", { name: "Ventiladores", exact: true })
    .check();
  await page.getByRole("checkbox", { name: "Lunes", exact: true }).uncheck();
  await page
    .getByRole("checkbox", { name: "Miércoles", exact: true })
    .uncheck();
  await page.getByRole("checkbox", { name: "Martes", exact: true }).check();
  await page.locator('.pattern input[type="time"]').fill("14:00");
  const preparation = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/reservas/periodicas/preparacion") &&
      r.request().postDataJSON()?.patterns?.length === 1 &&
      r.request().postDataJSON().patterns[0].day === 2 &&
      r.request().postDataJSON().patterns[0].start === "14:00",
  );
  await page.getByRole("button", { name: "Buscar aulas" }).click();
  const response = await preparation;
  expect(response.ok()).toBe(true);
  const result = await response.json();
  expect(
    result.patterns[0].alternatives.map(
      (a: { room: { id: string } }) => a.room.id,
    ),
  ).toEqual(["Lab 2", "Lab1"]);
  expect(
    result.patterns[0].alternatives.map(
      (a: { periodicMinutes: number }) => a.periodicMinutes,
    ),
  ).toEqual([480, 1920]);
  await page
    .getByText("Ver conflictos del aula Lab 2", { exact: true })
    .click();
  await page.screenshot({
    path: "/tmp/i034-real-alternativas.png",
    fullPage: true,
  });
  const request = response.request().postDataJSON();
  const second = await browser.newPage();
  try {
    await second.goto("/");
    await second.getByLabel("Correo electrónico").fill("docente@demo.local");
    await second.getByLabel("Contraseña", { exact: true }).fill(password);
    await second.getByRole("button", { name: "Ingresar", exact: true }).click();
    await expect(second.getByLabel("Fecha de agenda")).toBeVisible();
    const privateCheck = await second.evaluate(async (proposal) => {
      const session = JSON.parse(localStorage.getItem("aulas-auth")!);
      const result = await fetch("/api/reservas/periodicas/preparacion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(proposal),
      });
      const data = await result.json();
      return {
        status: result.status,
        count: data.patterns[0].alternatives.length,
        leaks: data.patterns[0].alternatives.some(
          (a: { conflicts: object[] }) =>
            a.conflicts.some((c) => "teacherEmail" in c || "registrant" in c),
        ),
      };
    }, request);
    expect(privateCheck).toEqual({ status: 200, count: 2, leaks: false });
  } finally {
    await second.close();
  }
});
