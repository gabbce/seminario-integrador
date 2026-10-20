import { test, expect } from "@playwright/test";
import { fakeAuth, login } from "./auth-fixture";

for (const operation of ["alta", "revisión"])
  for (const failure of [false, true])
    test(`${operation} demorada bloquea abrir otro año y libera controles ${failure ? "con error503" : "al guardar"}`, async ({
      page,
    }) => {
      await fakeAuth(page);
      const config = (year: number) => ({
        id: String(year),
        year,
        state: "En preparación",
        version: 0,
        terms: { first: ["", ""], second: ["", ""] },
        holidays: [],
        descriptions: {},
      });
      const calendars = [config(2026), config(2027)];
      let release!: () => void;
      const pending = new Promise<void>((resolve) => {
        release = resolve;
      });
      await page.route("**/api/referencias/calendarios", (route) =>
        route.fulfill({ json: calendars }),
      );
      await page.route("**/api/administracion/calendarios?**", (route) =>
        route.fulfill({
          json: {
            items: calendars,
            total: calendars.length,
            page: 0,
            size: 20,
          },
        }),
      );
      await page.route(
        "**/api/administracion/calendarios/*/cuatrimestres?**",
        (route) =>
          route.fulfill({
            json: { year: 2027, state: "En preparación", items: [] },
          }),
      );
      await page.route("**/api/administracion/calendarios", async (route) => {
        await pending;
        if (failure)
          return route.fulfill({
            status: 503,
            json: { message: "Alta no disponible." },
          });
        calendars.push(config(2028));
        await route.fulfill({ status: 201, json: config(2028) });
      });
      await page.route(
        "**/api/administracion/calendarios/2027/impacto",
        async (route) => {
          await pending;
          if (failure)
            return route.fulfill({
              status: 503,
              json: { message: "Alta no disponible." },
            });
          await route.fulfill({
            json: {
              calendar: config(2027),
              added: [],
              conflicts: [],
              canConfirm: true,
              stamp: "a".repeat(64),
            },
          });
        },
      );
      await page.goto("/");
      await login(page, "admin");
      await page.goto("/administracion/calendario");
      await expect(
        page.getByLabel("Número de año", { exact: true }),
      ).toHaveValue("2027");
      await page.getByLabel("Inicio 1", { exact: true }).fill("2027-03-01");
      await page
        .getByRole("button", {
          name: operation === "alta" ? "Crear año" : "Revisar impacto",
          exact: true,
        })
        .click();
      await expect(
        page.getByRole("button", { name: "Abrir año 2026" }),
      ).toBeDisabled();
      await expect(
        page.getByLabel("Año del calendario", { exact: true }),
      ).toBeDisabled();
      await expect(page.getByLabel("Inicio 1", { exact: true })).toBeDisabled();
      release();
      await expect(
        page.getByRole("button", { name: "Abrir año 2026" }),
      ).toBeEnabled();
      if (failure) {
        await expect(
          page.getByText("Alta no disponible.", { exact: true }),
        ).toBeVisible();
        await expect(page.getByLabel("Inicio 1", { exact: true })).toHaveValue(
          "2027-03-01",
        );
      } else if (operation === "alta")
        await expect(
          page.getByLabel("Número de año", { exact: true }),
        ).toHaveValue("2028");
      await page.getByRole("button", { name: "Abrir año 2026" }).click();
      await page.getByLabel("Inicio 1", { exact: true }).fill("2026-03-01");
      await expect(page.getByLabel("Inicio 1", { exact: true })).toHaveValue(
        "2026-03-01",
      );
    });

test("recarga lenta bloquea ediciones y altas hasta recuperar el calendario", async ({
  page,
}) => {
  await fakeAuth(page);
  const calendar = {
    id: "10",
    year: 2027,
    state: "En preparación",
    version: 0,
    terms: { first: ["", ""], second: ["", ""] },
    holidays: [],
    descriptions: {},
  };
  let delay = false;
  let unavailable = false;
  let release: (() => void) | undefined;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/referencias/calendarios", async (route) => {
    if (delay) await pending;
    if (unavailable)
      return route.fulfill({
        status: 503,
        json: { message: "No se pudo recargar el calendario." },
      });
    await route.fulfill({ json: [calendar] });
  });
  await page.route("**/api/administracion/calendarios?**", (route) =>
    route.fulfill({ json: { items: [calendar], total: 1, page: 0, size: 20 } }),
  );
  await page.route(
    "**/api/administracion/calendarios/10/cuatrimestres?**",
    (route) =>
      route.fulfill({ json: { year: 2027, state: calendar.state, items: [] } }),
  );
  await page.goto("/");
  await login(page, "admin");
  await page.goto("/administracion/calendario");
  await expect(page.getByLabel("Número de año", { exact: true })).toHaveValue(
    "2027",
  );
  const search = page.getByRole("region", { name: "Buscar años lectivos" });
  await search.getByLabel("Año a buscar").fill("2027");
  await search
    .getByRole("button", { name: "Buscar años", exact: true })
    .click();
  await expect(
    search.getByRole("button", { name: "Abrir año 2027" }),
  ).toBeVisible();
  await page.getByLabel("Inicio 1", { exact: true }).fill("2027-03-01");
  delay = true;
  await page
    .getByRole("button", { name: "Recargar calendario", exact: true })
    .click();
  await expect(
    page.getByLabel("Número de año", { exact: true }),
  ).toBeDisabled();
  await expect(page.getByLabel("Inicio 1", { exact: true })).toBeDisabled();
  await expect(page.getByLabel("Nuevo año", { exact: true })).toBeDisabled();
  await expect(
    page.getByLabel("Año del calendario", { exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Crear año", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Recargar calendario", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText("Recargando calendario. Esperá para editar o crear años.", {
      exact: true,
    }),
  ).toBeVisible();
  release!();
  await expect(page.getByLabel("Inicio 1", { exact: true })).toBeEnabled();
  await expect(page.getByLabel("Inicio 1", { exact: true })).toHaveValue("");
  await expect(search.getByLabel("Año a buscar")).toHaveValue("2027");
  await page.getByLabel("Inicio 1", { exact: true }).fill("2027-04-01");
  await expect(page.getByLabel("Inicio 1", { exact: true })).toHaveValue(
    "2027-04-01",
  );
  unavailable = true;
  await page
    .getByRole("button", { name: "Recargar calendario", exact: true })
    .click();
  await expect(
    page.getByText("No se pudo recargar el calendario.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Inicio 1", { exact: true })).toBeEnabled();
  await expect(page.getByLabel("Inicio 1", { exact: true })).toHaveValue(
    "2027-04-01",
  );
  await expect(search.getByLabel("Año a buscar")).toHaveValue("2027");
});
