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

test("I-02.1: perfil persistente y visible desde otra sesión", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  await page.getByLabel("Correo electrónico").fill("admin@demo.local");
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Agenda", exact: true }),
  ).toBeVisible();
  await page.goto("/administracion");
  await page.getByRole("button", { name: "Editar bedel@demo.local" }).click();
  const before = await page.getByLabel("Nombre", { exact: true }).inputValue();
  try {
    await page.getByLabel("Nombre", { exact: true }).fill("Bedel QA");
    await page
      .getByRole("button", { name: "Guardar cuenta", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("Cuenta guardada");
    await page.reload();
    await page.getByRole("button", { name: "Editar bedel@demo.local" }).click();
    await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue(
      "Bedel QA",
    );
    const other = await browser.newContext();
    try {
      const tab = await other.newPage();
      await tab.goto("http://127.0.0.1:5175/");
      await tab.getByLabel("Correo electrónico").fill("bedel@demo.local");
      await tab.getByLabel("Contraseña", { exact: true }).fill(password);
      await tab.getByRole("button", { name: "Ingresar", exact: true }).click();
      await expect(
        tab.getByText("Bedel QA · Bedel", { exact: true }),
      ).toBeVisible();
      await tab.getByRole("button", { name: "Cerrar sesión" }).click();
      await expect(
        tab.getByRole("heading", { name: "Ingresar", exact: true }),
      ).toBeVisible();
    } finally {
      await other.close();
    }
    await page.screenshot({
      path: "evidence/i021-real-cuentas.png",
      fullPage: true,
    });
  } finally {
    await page.getByLabel("Nombre", { exact: true }).fill(before);
    await page
      .getByRole("button", { name: "Guardar cuenta", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("Cuenta guardada");
  }
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(
    page.getByRole("heading", { name: "Ingresar", exact: true }),
  ).toBeVisible();
});

test("I-02.2: alta, cambio de correo y contraseña en Supabase", async ({
  page,
  browser,
}) => {
  test.setTimeout(90000);
  const email = `qa-${Date.now()}@demo.local`,
    changed = email.replace("qa-", "qa-email-");
  const secret = `Demo-Patio-${Date.now()}!`,
    nextSecret = `${secret}Nueva`;
  await page.goto("/");
  await page.getByLabel("Correo electrónico").fill("admin@demo.local");
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Agenda", exact: true }),
  ).toBeVisible();
  await page.goto("/administracion");
  await page.getByRole("button", { name: "Nueva cuenta", exact: true }).click();
  await page.getByLabel("Nombre", { exact: true }).fill("Cuenta QA");
  await page.getByLabel("Apellido", { exact: true }).fill("Ficticia");
  await page.getByLabel("Correo de acceso", { exact: true }).fill(email);
  await page.getByLabel("Nueva contraseña", { exact: true }).fill(secret);
  await page.getByLabel("Confirmar contraseña", { exact: true }).fill(secret);
  await page
    .getByRole("button", { name: "Guardar cuenta", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Cuenta guardada", {
    timeout: 30000,
  });
  const context = await browser.newContext();
  const tab = await context.newPage();
  async function enter(address: string, key: string) {
    await tab.goto("http://127.0.0.1:5175/");
    await tab.getByLabel("Correo electrónico").fill(address);
    await tab.getByLabel("Contraseña", { exact: true }).fill(key);
    await tab.getByRole("button", { name: "Ingresar", exact: true }).click();
    await expect(
      tab.getByRole("link", { name: "Agenda", exact: true }),
    ).toBeVisible();
    await tab.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(
      tab.getByRole("heading", { name: "Ingresar", exact: true }),
    ).toBeVisible();
  }
  try {
    await enter(email, secret);
    await page.getByRole("button", { name: `Editar ${email}` }).click();
    await page
      .getByRole("button", { name: "Cambiar correo", exact: true })
      .click();
    await page.getByLabel("Correo de acceso", { exact: true }).fill(changed);
    await page
      .getByRole("button", { name: "Guardar correo", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: `Editar ${changed}` }),
    ).toBeVisible({ timeout: 30000 });
    await enter(changed, secret);
    await page.getByRole("button", { name: `Editar ${changed}` }).click();
    await page
      .getByRole("button", { name: "Establecer contraseña", exact: true })
      .click();
    await page.getByLabel("Nueva contraseña", { exact: true }).fill(nextSecret);
    await page
      .getByLabel("Confirmar contraseña", { exact: true })
      .fill(nextSecret);
    await page
      .getByRole("button", { name: "Guardar contraseña", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText(
      "Contraseña actualizada",
      { timeout: 30000 },
    );
    await enter(changed, nextSecret);
    await tab.getByLabel("Correo electrónico").fill(changed);
    await tab.getByLabel("Contraseña", { exact: true }).fill(secret);
    await tab.getByRole("button", { name: "Ingresar", exact: true }).click();
    await expect(tab.getByRole("alert")).toContainText("no son correctos");
    await page.screenshot({
      path: "evidence/i022-real-cuentas.png",
      fullPage: true,
    });
    await page.getByRole("button", { name: `Editar ${changed}` }).click();
    await page
      .getByLabel("Estado de cuenta", { exact: true })
      .selectOption("inactive");
    await page
      .getByRole("button", { name: "Guardar cuenta", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("Cuenta guardada");
  } finally {
    await context.close();
  }
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(
    page.getByRole("heading", { name: "Ingresar", exact: true }),
  ).toBeVisible();
});
