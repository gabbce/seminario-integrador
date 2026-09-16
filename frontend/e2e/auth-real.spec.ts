import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
// Explicit opt-in suite. Never print credentials or collect traces containing tokens.
const lines = readFileSync(resolve("../backend/.env"), "utf8").split(/\r?\n/);
const password =
  process.env.AULAS_DEMO_PASSWORD ||
  lines
    .find((l) => l.startsWith("AULAS_DEMO_PASSWORD="))
    ?.slice("AULAS_DEMO_PASSWORD=".length)
    .replaceAll("\\\\", "\\");
if (!password)
  throw new Error("Configurar AULAS_DEMO_PASSWORD en backend/.env.");
for (const role of ["admin", "bedel", "docente", "inhabilitado"])
  test(`Auth real: ${role}`, async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Correo electrónico").fill(`${role}@demo.local`);
    await page.getByLabel("Contraseña", { exact: true }).fill(password);
    const profile = page.waitForResponse((r) => r.url().endsWith("/api/me"));
    await page.getByRole("button", { name: "Ingresar", exact: true }).click();
    expect((await profile).status()).toBe(role === "inhabilitado" ? 403 : 200);
    if (role === "inhabilitado")
      await expect(page.getByRole("alert")).toContainText("habilitado");
    else {
      await expect(
        page.getByRole("link", { name: "Agenda", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Administración", exact: true }),
      ).toHaveCount(role === "admin" ? 1 : 0);
      await expect(
        page.getByRole("link", { name: "Indicadores", exact: true }),
      ).toHaveCount(role === "docente" ? 0 : 1);
      await page.getByRole("link", { name: "Aulas", exact: true }).click();
      await page.reload();
      await expect(
        page.getByRole("link", { name: "Agenda", exact: true }),
      ).toBeVisible();
      await page.screenshot({
        path: `evidence/auth-real-${role}.png`,
        fullPage: true,
      });
    }
    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(
      page.getByRole("heading", { name: "Ingresar", exact: true }),
    ).toBeVisible();
    if (role !== "inhabilitado") {
      await page.goBack();
      await expect(
        page.getByRole("heading", { name: "Ingresar", exact: true }),
      ).toBeVisible();
    }
    await expect
      .poll(() =>
        page.evaluate(() => localStorage.getItem("aulas-auth") === null),
      )
      .toBe(true);
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Ingresar", exact: true }),
    ).toBeVisible();
  });
