import { test, expect } from "@playwright/test";
import { fakeAuth, login } from "./auth-fixture";

test("buscar años y cuatrimestres conserva filtros y admite páginas vacías", async ({
  page,
}) => {
  await fakeAuth(page);
  const calendar = {
    id: "10",
    year: 2027,
    state: "Habilitado",
    version: 0,
    terms: {
      first: ["2027-03-01", "2027-07-01"],
      second: ["2027-08-01", "2027-12-01"],
    },
    holidays: [],
    descriptions: {},
  };
  await page.route("**/api/referencias/calendarios", (route) =>
    route.fulfill({ json: [calendar] }),
  );
  await page.route("**/api/administracion/calendarios?**", (route) => {
    const q = new URL(route.request().url()).searchParams;
    const empty = q.get("year") === "2030" || q.get("page") === "1";
    return route.fulfill({
      json: {
        items: empty ? [] : [calendar],
        total: q.get("year") === "2030" ? 0 : 21,
        page: Number(q.get("page")),
        size: 20,
      },
    });
  });
  await page.route(
    "**/api/administracion/calendarios/10/cuatrimestres?**",
    (route) => {
      const q = new URL(route.request().url()).searchParams;
      return route.fulfill({
        json: {
          year: 2027,
          state: "Habilitado",
          items: q.get("from")
            ? []
            : [
                { number: 1, start: "2027-03-01", end: "2027-07-01" },
                { number: 2, start: "2027-08-01", end: "2027-12-01" },
              ],
        },
      });
    },
  );
  await page.goto("/");
  await login(page, "admin");
  await page.goto("/administracion/calendario");
  const search = page.getByRole("region", { name: "Buscar años lectivos" });
  await expect(
    search.getByText("2027 · Habilitado", { exact: true }),
  ).toBeVisible();
  await search.getByLabel("Año a buscar").fill("2027");
  await search.getByLabel("Estado a buscar").selectOption("Habilitado");
  await search
    .getByRole("button", { name: "Buscar años", exact: true })
    .click();
  await search.getByRole("button", { name: "Página siguiente" }).click();
  await expect(search.getByText("Sin años coincidentes.")).toBeVisible();
  await expect(search.getByLabel("Año a buscar")).toHaveValue("2027");
  await expect(search.getByLabel("Estado a buscar")).toHaveValue("Habilitado");
  await search.getByRole("button", { name: "Página anterior" }).click();
  await search.getByRole("button", { name: "Abrir año 2027" }).click();
  const terms = page.getByRole("region", { name: "Buscar cuatrimestres" });
  await expect(
    terms.getByText("Cuatrimestre 1", { exact: true }),
  ).toBeVisible();
  await terms.getByLabel("Cuatrimestres desde").fill("2027-07-02");
  await terms.getByLabel("Cuatrimestres hasta").fill("2027-07-31");
  await terms
    .getByRole("button", { name: "Buscar cuatrimestres", exact: true })
    .click();
  await expect(
    terms.getByText("Sin cuatrimestres coincidentes."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Recargar calendario", exact: true })
    .click();
  await expect(terms.getByLabel("Cuatrimestres desde")).toHaveValue(
    "2027-07-02",
  );
  await terms.getByLabel("Cuatrimestres hasta").fill("2027-03-01");
  await terms
    .getByRole("button", { name: "Buscar cuatrimestres", exact: true })
    .click();
  await expect(
    terms.getByText("La fecha desde debe ser anterior o igual a hasta."),
  ).toBeVisible();
});
