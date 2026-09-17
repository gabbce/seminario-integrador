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
