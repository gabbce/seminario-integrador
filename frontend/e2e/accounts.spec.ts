import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { fakeAuth, login } from "./auth-fixture";
for (const width of [390, 1440])
  test(`cuentas persistidas: edición y filtros a ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await fakeAuth(page);
    let user = {
      id: "2",
      version: 0,
      name: "Bedel",
      surname: "Demo",
      email: "bedel@demo.local",
      role: "Bedel",
      active: true,
      shift: "TARDE",
      staffId: null,
    };
    await page.route("**/api/administracion/cuentas**", async (route) => {
      if (route.request().method() === "PUT") {
        const incoming = route.request().postDataJSON();
        expect(incoming.version).toBe(user.version);
        user = { ...user, ...incoming, version: user.version + 1 };
        await route.fulfill({ json: user });
        return;
      }
      const params = new URL(route.request().url()).searchParams;
      const items = params.get("query") === "ausente" ? [] : [user];
      await route.fulfill({
        json: {
          items,
          total: items.length,
          page: 1,
          size: 20,
          activeAdmins: 1,
        },
      });
    });
    await page.goto("/");
    await login(page, "admin");
    await expect(
      page.getByRole("heading", { name: "8 de septiembre de 2026" }),
    ).toBeVisible();
    await page.goto("/administracion");
    await page.getByRole("button", { name: "Editar bedel@demo.local" }).click();
    await page.getByLabel("Nombre", { exact: true }).fill("Bedel editado");
    await page
      .getByRole("button", { name: "Guardar cuenta", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("Cuenta guardada");
    await page.reload();
    await expect(
      page.getByText("Bedel editado Demo", { exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: `evidence/i021-cuentas-${width}.png`,
      fullPage: true,
    });
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.getByLabel("Buscar nombre o correo").fill("ausente");
    await expect(page.getByText("No hay cuentas coincidentes.")).toBeVisible();
  });
test("alta, correo y contraseña usan operaciones separadas", async ({
  page,
}) => {
  await fakeAuth(page);
  let user = {
    id: "8",
    version: 0,
    name: "Nueva",
    surname: "Cuenta",
    email: "nueva@demo.local",
    role: "Bedel",
    active: true,
  };
  let created = false;
  let passwordCalls = 0;
  await page.route("**/api/administracion/cuentas**", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    if (request.method() === "GET") {
      await route.fulfill({
        json: {
          items: created ? [user] : [],
          total: created ? 1 : 0,
          page: 1,
          size: 20,
          activeAdmins: 1,
        },
      });
      return;
    }
    const body = request.postDataJSON();
    expect(body.operationId).toBeTruthy();
    if (url.pathname.endsWith("/password")) {
      passwordCalls++;
      await route.fulfill({ json: { message: "Contraseña actualizada." } });
      return;
    }
    if (url.pathname.endsWith("/email"))
      user = { ...user, email: body.email, version: 1 };
    else {
      created = true;
      user = {
        ...user,
        name: body.name,
        surname: body.surname,
        email: body.email,
      };
    }
    await route.fulfill({ json: user });
  });
  await page.goto("/");
  await login(page, "admin");
  await expect(
    page.getByRole("link", { name: "Agenda", exact: true }),
  ).toBeVisible();
  await page.goto("/administracion");
  await page.getByRole("button", { name: "Nueva cuenta", exact: true }).click();
  await page.getByLabel("Nombre", { exact: true }).fill("Nueva");
  await page.getByLabel("Apellido", { exact: true }).fill("Cuenta");
  await page
    .getByLabel("Correo de acceso", { exact: true })
    .fill("nueva@demo.local");
  await page.getByLabel("Nueva contraseña", { exact: true }).fill("Prueba123");
  await page
    .getByLabel("Confirmar contraseña", { exact: true })
    .fill("Prueba123");
  await page
    .getByRole("button", { name: "Guardar cuenta", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Cuenta guardada");
  await page.getByRole("button", { name: "Editar nueva@demo.local" }).click();
  await page
    .getByRole("button", { name: "Cambiar correo", exact: true })
    .click();
  await page
    .getByLabel("Correo de acceso", { exact: true })
    .fill("modificada@demo.local");
  await page
    .getByRole("button", { name: "Guardar correo", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Editar modificada@demo.local" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Editar modificada@demo.local" })
    .click();
  await page
    .getByRole("button", { name: "Establecer contraseña", exact: true })
    .click();
  await page.getByLabel("Nueva contraseña", { exact: true }).fill("Nueva123");
  await page
    .getByLabel("Confirmar contraseña", { exact: true })
    .fill("Nueva123");
  await page
    .getByRole("button", { name: "Guardar contraseña", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Contraseña actualizada",
  );
  expect(passwordCalls).toBe(1);
});
