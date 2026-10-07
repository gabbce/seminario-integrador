import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const password =
  process.env.AULAS_DEMO_PASSWORD ||
  readFileSync("../backend/.env", "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith("AULAS_DEMO_PASSWORD="))
    ?.slice("AULAS_DEMO_PASSWORD=".length)
    .replaceAll("\\\\", "\\");
// Consulta de referencia I-04: Historia 14/07/2027 07–08, aula103. Solo lectura.
test("indicadores resumen real, receso y privacidad", async ({
  page,
  browser,
  baseURL,
}) => {
  await page.goto("/");
  await page.getByLabel("Correo electrónico").fill("bedel@demo.local");
  await page.getByLabel("Contraseña", { exact: true }).fill(password!);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page.getByLabel("Fecha de agenda")).toBeVisible();
  await page.goto("/indicadores?date=2027-07-14&room=103");
  await expect(
    page.getByText("1 / 16 h habilitadas", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("6,3 %", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("img", { name: /Alumnos previstos. Pico 20/ }),
  ).toBeVisible();
  await page.getByLabel("Franja del día").selectOption("0");
  await expect(page.getByRole("status")).toContainText(
    "20 alumnos previstos · 1 clases simultáneas",
  );
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.screenshot({
    path: "../artifacts/qa/screens/i053-summary-real.png",
    fullPage: true,
  });
  const second = await browser.newPage({ baseURL });
  try {
    await second.goto("/");
    await second.getByLabel("Correo electrónico").fill("docente@demo.local");
    await second.getByLabel("Contraseña", { exact: true }).fill(password!);
    await second.getByRole("button", { name: "Ingresar", exact: true }).click();
    await expect(second.getByLabel("Fecha de agenda")).toBeVisible();
    const status = await second.evaluate(async () => {
      const token = JSON.parse(
        localStorage.getItem("aulas-auth")!,
      ).access_token;
      return (
        await fetch("/api/indicadores/resumen?from=2027-07-14&to=2027-07-14", {
          headers: { Authorization: `Bearer ${token}` },
        })
      ).status;
    });
    expect(status).toBe(403);
  } finally {
    await second.close();
  }
});
