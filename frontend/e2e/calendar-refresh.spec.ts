import { test, expect } from "@playwright/test";
import { fakeAuth, login } from "./auth-fixture";
import type { PersistedCalendarConfig } from "../src/pages/PersistedCalendar";

test("crear año conserva el formulario mientras se recargan sus referencias", async ({
  page,
}) => {
  await fakeAuth(page);
  const calendar = (year: number): PersistedCalendarConfig => ({
    id: String(year),
    year,
    version: 0,
    state: "En preparación",
    terms: { first: ["", ""], second: ["", ""] },
    holidays: [],
    descriptions: {},
  });
  const calendars = [calendar(2027)];
  let releaseCourses!: () => void;
  let coursesRequested!: () => void;
  const requested = new Promise<void>((resolve) => {
    coursesRequested = resolve;
  });
  const release = new Promise<void>((resolve) => {
    releaseCourses = resolve;
  });
  await page.route("**/api/referencias/calendarios", (route) =>
    route.fulfill({ json: calendars }),
  );
  await page.route("**/api/referencias/cursos?year=2028", async (route) => {
    coursesRequested();
    await release;
    await route.fulfill({ json: [] });
  });
  await page.route("**/api/administracion/calendarios**", async (route) => {
    if (new URL(route.request().url()).pathname.endsWith("/cuatrimestres")) {
      await route.fulfill({
        json: { year: 2028, state: "En preparación", items: [] },
      });
      return;
    }
    if (route.request().method() === "GET") {
      await route.fulfill({
        json: { items: calendars, total: calendars.length, page: 0, size: 20 },
      });
      return;
    }
    const saved = calendar(route.request().postDataJSON().year);
    calendars.push(saved);
    await route.fulfill({ status: 201, json: saved });
  });
  await page.goto("/");
  await login(page, "admin");
  await expect(page.getByLabel("Fecha de agenda")).toBeVisible();
  await page.goto("/administracion/calendario");
  await page.getByLabel("Nuevo año", { exact: true }).fill("2028");
  await page.getByRole("button", { name: "Crear año", exact: true }).click();
  await requested;
  try {
    await expect(page.getByLabel("Inicio 1", { exact: true })).toBeVisible({
      timeout: 2000,
    });
    await page.getByLabel("Inicio 1", { exact: true }).fill("2028-03-06");
    await page.getByLabel("Nuevo año", { exact: true }).fill("2030");
  } finally {
    releaseCourses();
  }
  await expect(page.getByText("Cargando datos…", { exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByLabel("Inicio 1", { exact: true })).toHaveValue(
    "2028-03-06",
  );
  await expect(page.getByLabel("Nuevo año", { exact: true })).toHaveValue(
    "2030",
  );
  await expect(page.getByLabel("Año del calendario")).toHaveValue("2028");
});
