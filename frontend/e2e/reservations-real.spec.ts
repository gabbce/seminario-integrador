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
