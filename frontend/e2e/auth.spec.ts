import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { fakeAuth, login } from "./auth-fixture";

test("roles, recarga y cierre con sesión de proveedor", async ({ page }) => {
  await fakeAuth(page);
  await page.goto("/");
  for (const role of ["admin", "bedel", "docente"]) {
    await login(page, role);
    await expect(
      page.getByRole("link", { name: "Agenda", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Administración", exact: true }),
    ).toHaveCount(role === "admin" ? 1 : 0);
    await expect(
      page.getByRole("link", { name: "Indicadores", exact: true }),
    ).toHaveCount(role === "docente" ? 0 : 1);
    await expect(
      page.getByRole("button", { name: "Nueva reserva", exact: true }),
    ).toHaveCount(role === "docente" ? 0 : 1);
    await page.getByRole("link", { name: "Aulas", exact: true }).click();
    await page.reload();
    await expect(
      page.getByRole("link", { name: "Agenda", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(
      page.getByRole("heading", { name: "Ingresar", exact: true }),
    ).toBeVisible();
    await page.goBack();
    await expect(
      page.getByRole("heading", { name: "Ingresar", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => localStorage.getItem("aulas-auth")),
    ).toBeNull();
  }
});
test("error de contraseña, servicio recuperable y cuenta deshabilitada", async ({
  page,
}) => {
  const state = await fakeAuth(page);
  await page.goto("/");
  await login(page, "bedel", "Incorrecta");
  await expect(page.getByRole("alert")).toContainText("no son correctos");
  await expect(page.getByRole("alert")).toBeFocused();
  state.api = "service";
  await login(page);
  await expect(
    page.getByRole("button", { name: "Reintentar", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("aulas-auth")),
  ).not.toBeNull();
  state.api = "normal";
  await page.getByRole("button", { name: "Reintentar", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Agenda", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await login(page, "inhabilitado");
  await expect(page.getByRole("alert")).toContainText("no tiene acceso");
  await expect(
    page.getByRole("link", { name: "Agenda", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(
    page.getByRole("heading", { name: "Ingresar", exact: true }),
  ).toBeVisible();
});
test("un rechazo persistente renueva una sola vez y vuelve al ingreso", async ({
  page,
}) => {
  const state = await fakeAuth(page);
  state.api = "unauthorized";
  await page.goto("/");
  await login(page);
  await expect.poll(() => state.refreshes).toBe(1);
  await expect(
    page.getByRole("heading", { name: "Ingresar", exact: true }),
  ).toBeVisible();
  expect(state.refreshes).toBe(1);
});
test("cerrar sesión limpia acceso local aunque falle el proveedor", async ({
  page,
}) => {
  const state = await fakeAuth(page);
  await page.goto("/");
  await login(page);
  await expect(
    page.getByRole("link", { name: "Agenda", exact: true }),
  ).toBeVisible();
  state.signOutFailure = true;
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("aulas-auth")))
    .toBeNull();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Ingresar", exact: true }),
  ).toBeVisible();
});
for (const width of [390, 768, 1440])
  test(`ingreso y navegación conservan diseño a ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await fakeAuth(page);
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Ingresar", exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: `evidence/auth-login-${width}.png`,
      fullPage: true,
    });
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.getByLabel("Correo electrónico").focus();
    await page.keyboard.type("admin@demo.local");
    await page.keyboard.press("Tab");
    await page.keyboard.type("Prueba123");
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("heading", { name: "8 de septiembre de 2026" }),
    ).toBeVisible();
    if (width <= 768)
      await page.getByRole("button", { name: "Menú", exact: true }).click();
    await expect(
      page.getByRole("link", { name: "Administración", exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: `evidence/auth-agenda-${width}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
  });

test("el cierre demorado bloquea la app hasta limpiar la sesión", async ({
  page,
}) => {
  const state = await fakeAuth(page);
  state.signOutDelay = 800;
  await page.goto("/");
  await login(page);
  await expect(
    page.getByRole("link", { name: "Agenda", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page.getByRole("status")).toHaveText("Cerrando sesión…");
  await expect(
    page.getByRole("link", { name: "Agenda", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Ingresar", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("aulas-auth") === null),
  ).toBe(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Ingresar", exact: true }),
  ).toBeVisible();
});
test("perfil malformado muestra un error recuperable sin detalles internos", async ({
  page,
}) => {
  const state = await fakeAuth(page);
  state.api = "malformed";
  await page.goto("/");
  await login(page);
  await expect(page.getByRole("alert")).toHaveText(
    "La respuesta de perfil no es válida. Intentá nuevamente.",
  );
  state.api = "normal";
  await page.getByRole("button", { name: "Reintentar", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Agenda", exact: true }),
  ).toBeVisible();
});
