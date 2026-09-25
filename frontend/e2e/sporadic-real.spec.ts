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

// Explicit opt-in. Creates fictional QA data and preserves every prior record.
test("I-04.1 real: esporádica en receso, recarga y segunda sesión", async ({
  page,
  browser,
}) => {
  test.setTimeout(180000);
  await page.goto("/");
  await page.getByLabel("Correo electrónico").fill("bedel@demo.local");
  await page.getByLabel("Contraseña", { exact: true }).fill(password!);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Agenda", exact: true }),
  ).toBeVisible();
  const course = await page.evaluate(async () => {
    const session = JSON.parse(localStorage.getItem("aulas-auth")!);
    const response = await fetch("/api/referencias/cursos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        subject: "QA I04 Actividad esporádica",
        commission: "QA",
        year: 2027,
      }),
    });
    const data = await response.json();
    return { status: response.status, id: data.id };
  });
  expect(course.status).toBe(200);
  await page.goto("/reservas/nueva");
  await page.getByLabel("Año de la reserva").selectOption("2027");
  await page.getByLabel("Modalidad", { exact: true }).selectOption("sporadic");
  await page
    .getByRole("combobox", { name: "Tipo de aula", exact: true })
    .selectOption("General");
  await page.getByLabel("Cantidad de alumnos prevista").fill("20");
  await page.getByLabel("Fecha", { exact: true }).fill("2027-07-19");
  await page
    .getByRole("button", { name: "Agregar fecha", exact: true })
    .click();
  await page.getByLabel("Fecha", { exact: true }).nth(1).fill("2027-07-21");
  // Select the explicitly identified QA course through the existing course selector.
  await page
    .getByRole("combobox", { name: "Curso", exact: true })
    .selectOption(course.id);
  await page.getByRole("button", { name: "Buscar aulas" }).click();
  await page.locator('input[name="room-1"]').first().check();
  await page.locator('input[name="room-2"]').nth(1).check();
  await page.getByRole("button", { name: "Revisar reserva" }).click();
  await page.screenshot({
    path: "/tmp/i041-real-revision.png",
    fullPage: true,
  });
  const response = page.waitForResponse((r) =>
    r.url().endsWith("/api/reservas/esporadicas/confirmacion"),
  );
  await page
    .getByRole("button", { name: "Confirmar reserva", exact: true })
    .click();
  const result = await response;
  expect(result.status()).toBe(200);
  const booking = await result.json();
  expect(booking.occurrences).toHaveLength(2);
  await expect(
    page.getByRole("heading", { name: "Reserva confirmada" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ver detalle", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "QA I04 Actividad esporádica",
      exact: true,
    }),
  ).toBeVisible();
  await page.screenshot({ path: "/tmp/i041-real-detalle.png", fullPage: true });
  const second = await browser.newPage({
    viewport: { width: 390, height: 900 },
  });
  try {
    await second.goto("/");
    await second.getByLabel("Correo electrónico").fill("docente@demo.local");
    await second.getByLabel("Contraseña", { exact: true }).fill(password!);
    await second.getByRole("button", { name: "Ingresar", exact: true }).click();
    await expect(second.getByLabel("Fecha de agenda")).toBeVisible();
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
    await second.screenshot({
      path: "/tmp/i041-real-docente-390.png",
      fullPage: true,
    });
  } finally {
    await second.close();
  }
  console.log(
    `I-04.1: reserva ficticia conservada ${booking.id}, curso ${course.id}, fechas 2027-07-19 y 2027-07-21.`,
  );
});
