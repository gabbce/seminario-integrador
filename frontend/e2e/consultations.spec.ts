import { test, expect } from "@playwright/test";
import { fakeAuth, login } from "./auth-fixture";
import type { ConsultationRow } from "../src/consultations";
const rows: ConsultationRow[] = Array.from({ length: 121 }, (_, i) => ({
  id: String(i + 1),
  bookingId: "80",
  courseId: "8",
  course: "001-A-2027",
  subject: `Clase ${i + 1}`,
  teacher: "Laura Gómez",
  students: 30,
  date: "2027-03-01",
  start: "14:00",
  end: "15:00",
  room: "101",
  type: "General",
  cancelled: i === 120,
}));
test("consulta paginada, filtros, retorno y errores; sin descarga global", async ({
  page,
}) => {
  await fakeAuth(page);
  let globals = 0,
    fail = false;
  await page.route("**/api/reservas", (r) => {
    globals++;
    return r.fulfill({ json: [] });
  });
  await page.route("**/api/referencias/calendarios", (r) =>
    r.fulfill({
      json: [
        {
          year: 2027,
          state: "Habilitado",
          terms: {
            first: ["2027-03-01", "2027-07-01"],
            second: ["2027-08-01", "2027-12-01"],
          },
          holidays: [],
          descriptions: {},
        },
      ],
    }),
  );
  await page.route("**/api/referencias/aulas", (r) =>
    r.fulfill({
      json: [
        {
          id: "101",
          type: "General",
          capacity: 40,
          state: "Habilitada",
          history: [
            { at: "2027-01-01T00:00", state: "Habilitada", type: "General" },
          ],
        },
      ],
    }),
  );
  await page.route("**/api/referencias/cursos?*", (r) =>
    r.fulfill({
      json: [
        { id: "8", code: 1, subject: "Consulta", commission: "A", year: 2027 },
      ],
    }),
  );
  await page.route("**/api/reservas/80", (r) =>
    r.fulfill({
      json: {
        id: "80",
        subject: "Consulta",
        course: "001-A-2027",
        teacher: "Laura Gómez",
        students: 30,
        occurrences: [
          {
            id: "1",
            date: "2027-03-01",
            start: "14:00",
            end: "15:00",
            room: "101",
          },
        ],
      },
    }),
  );
  await page.route("**/api/consultas/**", async (r) => {
    const p = new URL(r.request().url()).searchParams;
    if (fail)
      return r.fulfill({ status: 503, json: { message: "Fallo de consulta" } });
    const selected = rows.filter(
      (x) =>
        p.get("date") === "2027-03-01" &&
        (p.get("status") === "all" ||
          (p.get("status") === "cancelled" ? x.cancelled : !x.cancelled)),
    );
    const size = Number(p.get("size") || 0),
      index = Number(p.get("page") || 0);
    await r.fulfill({
      json: {
        rows: size
          ? selected.slice(index * size, (index + 1) * size)
          : selected,
        total: selected.length,
        size,
        page: index,
        filters: Object.fromEntries(p),
      },
    });
  });
  await page.goto("/reservas?date=2027-03-01");
  await login(page, "docente");
  await expect(page.getByLabel("Fecha de agenda")).toBeVisible();
  await page.goto("/reservas?date=2027-03-01");
  await expect(page.getByText("120 resultados")).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(20);
  await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  await page.getByRole("button", { name: "Clase 21", exact: true }).click();
  await page.getByRole("button", { name: "Reservas", exact: true }).click();
  await expect(page.getByText("Página 2 de 6")).toBeVisible();
  await page.getByLabel("Estado del listado").selectOption("cancelled");
  await expect(page.getByText("1 resultado", { exact: false })).toBeVisible();
  await expect(page.getByText("Página 1 de 1")).toBeVisible();
  fail = true;
  await page.getByLabel("Estado del listado").selectOption("all");
  await expect(page.getByRole("alert")).toContainText("Fallo de consulta");
  await expect(
    page.getByText("No hay reservas para estos filtros."),
  ).toHaveCount(0);
  fail = false;
  await page.getByRole("button", { name: "Reintentar consulta" }).click();
  await expect(page.getByText("121 resultados")).toBeVisible();
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.screenshot({
    path: "../artifacts/qa/screens/i05-listado-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "../artifacts/qa/screens/i05-listado-mobile.png",
    fullPage: true,
  });
  expect(globals).toBe(0);
});
test("respuestas tardías no reemplazan el filtro vigente", async ({ page }) => {
  await fakeAuth(page);
  await page.route("**/api/consultas/**", async (r) => {
    const date = new URL(r.request().url()).searchParams.get("date");
    if (date === "2027-03-01")
      await new Promise((resolve) => setTimeout(resolve, 400));
    await r.fulfill({
      json: {
        rows: date === "2027-03-01" ? rows : [],
        total: date === "2027-03-01" ? 121 : 0,
        page: 0,
        size: 20,
        filters: {},
      },
    });
  });
  await page.goto("/reservas?date=2027-03-02");
  await login(page);
  await expect(page.getByLabel("Fecha de agenda")).toBeVisible();
  await page.goto("/reservas?date=2027-03-02");
  await expect(
    page.getByText("No hay reservas para estos filtros."),
  ).toBeVisible();
  await page.getByLabel("Fecha del listado").fill("2027-03-01");
  await page.getByLabel("Fecha del listado").fill("2027-03-03");
  await expect(
    page.getByText("No hay reservas para estos filtros."),
  ).toBeVisible();
  await page.waitForTimeout(600);
  await expect(page.locator("tbody tr")).toHaveCount(0);
});

test("agenda conserva tipo histórico, franjas y fecha al abrir día desde semana", async ({
  page,
}) => {
  await fakeAuth(page);
  await page.route("**/api/referencias/aulas", (r) =>
    r.fulfill({
      json: [
        {
          id: "101",
          type: "Laboratorio",
          capacity: 40,
          state: "Inhabilitada",
          history: [
            { at: "2027-01-01T00:00", state: "Habilitada", type: "General" },
            {
              at: "2027-04-01T00:00",
              state: "Inhabilitada",
              type: "Laboratorio",
            },
          ],
        },
      ],
    }),
  );
  await page.route("**/api/referencias/calendarios", (r) =>
    r.fulfill({
      json: [
        {
          year: 2027,
          state: "Habilitado",
          terms: {
            first: ["2027-03-01", "2027-07-01"],
            second: ["2027-08-01", "2027-12-01"],
          },
          holidays: [],
        },
      ],
    }),
  );
  await page.route("**/api/consultas/agenda?*", (r) =>
    r.fulfill({
      json: { rows: [rows[0]], total: 1, page: 0, size: 0, filters: {} },
    }),
  );
  await page.goto("/");
  await login(page);
  await expect(page.getByLabel("Fecha de agenda")).toBeVisible();
  await page.getByLabel("Fecha de agenda").fill("2027-03-01");
  await page
    .getByLabel("Filtrar tipo", { exact: true })
    .selectOption("General");
  await expect(page.locator(".room-head").last()).toContainText("General");
  await expect(page.locator(".booking")).toHaveClass(/General/);
  await expect(page.locator(".agenda-unavailable-slot")).toHaveCount(0);
  await page.getByRole("button", { name: "Semana", exact: true }).click();
  await page
    .getByRole("button", { name: "Ver día", exact: true })
    .nth(2)
    .click();
  await expect(page.getByLabel("Fecha de agenda")).toHaveValue("2027-03-03");
  await expect(page.locator(".eyebrow").first()).toHaveText("AGENDA DIARIA");
  await page.screenshot({
    path: "../artifacts/qa/screens/i05-agenda-historical.png",
    fullPage: true,
  });
});
