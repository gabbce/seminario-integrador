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

test("I-02.3: aula persiste y baja conserva historial", async ({ page }) => {
  test.setTimeout(120000);
  const code = `QA-${Date.now()}`;
  await page.goto("/");
  await page.getByLabel("Correo electrónico").fill("bedel@demo.local");
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Agenda", exact: true }),
  ).toBeVisible();
  await page.goto("/aulas");
  await page.getByLabel("Buscar aula", { exact: true }).fill(code);
  await page.getByRole("button", { name: "Nueva aula", exact: true }).click();
  await page.getByLabel("Identificador", { exact: true }).fill(code);
  await page
    .getByLabel("Ubicación / edificio", { exact: true })
    .fill("Edificio QA");
  await page
    .getByLabel("Tipo de aula", { exact: true })
    .selectOption("Laboratorio");
  await page.getByRole("button", { name: "Guardar aula", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Aula guardada" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: `Editar ${code}` }),
  ).toBeVisible();
  await page.reload();
  await page.getByLabel("Buscar aula", { exact: true }).fill(code);
  await page.getByRole("button", { name: `Editar ${code}` }).click();
  await expect(page.getByLabel("Tipo de aula", { exact: true })).toHaveValue(
    "Laboratorio",
  );
  await page
    .getByLabel("Estado del aula", { exact: true })
    .selectOption("Mantenimiento");
  await page.getByRole("button", { name: "Guardar aula", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Aula guardada" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: `Editar ${code}` }),
  ).toBeVisible();
  await page.getByRole("button", { name: `Editar ${code}` }).click();
  await page.screenshot({
    path: "evidence/i023-real-aula.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Dar de baja", exact: true }).click();
  await page
    .getByRole("button", { name: "Confirmar baja", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Aula dada de baja" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: `Editar ${code}` }),
  ).toHaveCount(0);
  await page
    .getByLabel("Estado de inventario", { exact: true })
    .selectOption("Baja");
  await expect(page.getByRole("button", { name: `Ver ${code}` })).toBeVisible();
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(
    page.getByRole("heading", { name: "Ingresar", exact: true }),
  ).toBeVisible();
});

test("I-02.4: calendario persiste tras recarga", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto("/");
  await page.getByLabel("Correo electrónico").fill("admin@demo.local");
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Agenda", exact: true }),
  ).toBeVisible();
  await page.goto("/administracion/calendario");
  await expect(page.getByLabel("Nuevo año", { exact: true })).toBeVisible();
  if (
    await page
      .getByRole("option", { name: "2028 · Habilitado", exact: true })
      .count()
  ) {
    await page
      .getByLabel("Año del calendario", { exact: true })
      .selectOption("2028");
  } else {
    await page.getByLabel("Nuevo año", { exact: true }).fill("2028");
    await page.getByRole("button", { name: "Crear año", exact: true }).click();
  }
  await expect(page.getByLabel("Número de año", { exact: true })).toHaveValue(
    "2028",
  );
  for (const [label, date] of [
    ["Inicio 1", "2028-03-01"],
    ["Fin 1", "2028-07-01"],
    ["Inicio 2", "2028-08-01"],
    ["Fin 2", "2028-12-01"],
  ])
    await page.getByLabel(label, { exact: true }).fill(date);
  if (
    await page.getByLabel("Descripción 2028-10-12", { exact: true }).count()
  ) {
    await page
      .getByLabel("Descripción 2028-10-12", { exact: true })
      .fill("Fecha ficticia QA");
  } else {
    await page.getByLabel("Nueva fecha no lectiva").fill("2028-10-12");
    await page.getByLabel("Descripción nueva").fill("Fecha ficticia QA");
    await page
      .getByRole("button", { name: "Agregar fecha", exact: true })
      .click();
  }
  await page
    .getByLabel("Estado del año", { exact: true })
    .selectOption("Habilitado");
  await page
    .getByRole("button", { name: "Guardar calendario", exact: true })
    .click();
  await expect(
    page.getByText("Calendario actualizado.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByLabel("Descripción 2028-10-12", { exact: true }),
  ).toHaveValue("Fecha ficticia QA");
  await page.screenshot({
    path: "evidence/i024-real-calendario.png",
    fullPage: true,
  });
});

test("I-02.5: curso creado desde reserva persiste", async ({ page }) => {
  test.setTimeout(120000);
  const subject = `Materia QA ${Date.now()}`;
  await page.goto("/");
  await page.getByLabel("Correo electrónico").fill("bedel@demo.local");
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Agenda", exact: true }),
  ).toBeVisible();
  await page.goto("/reservas/nueva");
  await page
    .getByLabel("Año de la reserva", { exact: true })
    .selectOption("2028");
  await page.getByRole("button", { name: "Crear curso", exact: true }).click();
  await page.getByLabel("Nombre de materia", { exact: true }).fill(subject);
  await page.getByLabel("Comisión", { exact: true }).fill("a");
  await page
    .getByRole("button", { name: "Guardar curso y seleccionar", exact: true })
    .click();
  await expect(
    page.getByRole("option", {
      name: new RegExp(subject + " · [0-9]+-A-2028"),
    }),
  ).toHaveCount(1);
  const key = await page.getByLabel("Curso", { exact: true }).inputValue();
  expect(key.length > 0).toBe(true);
  await page.reload();
  await page
    .getByLabel("Año de la reserva", { exact: true })
    .selectOption("2028");
  await page.getByLabel("Curso", { exact: true }).selectOption(key);
  await expect(
    page.getByRole("option", {
      name: new RegExp(subject + " · [0-9]+-A-2028"),
    }),
  ).toHaveCount(1);
  await page.screenshot({
    path: "evidence/i025-real-referencias.png",
    fullPage: true,
  });
});

test("I-02.6: catálogos de demo poblados", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto("/");
  await page.getByLabel("Correo electrónico").fill("admin@demo.local");
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Agenda", exact: true }),
  ).toBeVisible();
  await page.goto("/aulas");
  await page.getByLabel("Buscar aula", { exact: true }).fill("Lab 2");
  await expect(
    page.getByRole("button", { name: "Editar Lab 2", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Buscar aula", { exact: true }).fill("");
  await expect(
    page.getByRole("button", { name: "Editar 105", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "evidence/i026-demo-aulas.png",
    fullPage: true,
  });
  await page.goto("/administracion/calendario");
  for (const year of ["2026", "2027"]) {
    await page
      .getByLabel("Año del calendario", { exact: true })
      .selectOption(year);
    await expect(
      page.getByLabel("Estado del año", { exact: true }),
    ).toHaveValue("Habilitado");
    await expect(page.getByLabel("Inicio 1", { exact: true })).toHaveValue(
      `${year}-03-09`,
    );
  }
  await page.goto("/reservas/nueva");
  for (const year of ["2026", "2027"]) {
    await page
      .getByLabel("Año de la reserva", { exact: true })
      .selectOption(year);
    expect(
      await page.getByLabel("Curso", { exact: true }).locator("option").count(),
    ).toBeGreaterThanOrEqual(21);
  }
  await page.screenshot({
    path: "evidence/i026-demo-referencias.png",
    fullPage: true,
  });
});
