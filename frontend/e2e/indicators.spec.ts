import { test, expect } from "@playwright/test";
import { fakeAuth, login } from "./auth-fixture";
const summary = {
  from: "2027-03-01",
  to: "2027-03-01",
  room: "",
  type: "",
  hours: 2,
  availableHours: 10,
  occupancy: 20,
  classes: 1,
  unknownCoverage: false,
  eligible: true,
  forecast: true,
  demand: [{ label: "General", hours: 2, availableHours: 10, classes: 1 }],
  rooms: [
    { label: "A", hours: 2, availableHours: 8, classes: 1 },
    { label: "B", hours: 0, availableHours: 2, classes: 0 },
  ],
};
for (const width of [1366, 390])
  test(`resumen histórico persistente ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 768 });
    await fakeAuth(page);
    await page.route("**/api/referencias/aulas", (r) =>
      r.fulfill({
        json: [{ id: "A", type: "General", capacity: 40, state: "Habilitada" }],
      }),
    );
    let fail = false;
    await page.route("**/api/indicadores/resumen?*", async (r) => {
      const p = new URL(r.request().url()).searchParams;
      if (fail)
        return r.fulfill({
          status: 503,
          json: { message: "Indicadores no disponibles" },
        });
      await r.fulfill({
        json: {
          ...summary,
          ...(p.get("room") === "A"
            ? {
                availableHours: 8,
                occupancy: 25,
                demand: [
                  { label: "General", hours: 2, availableHours: 8, classes: 1 },
                ],
                rooms: [
                  { label: "A", hours: 2, availableHours: 8, classes: 1 },
                ],
              }
            : {}),
        },
      });
    });
    await page.goto("/");
    await login(page);
    await expect(page.getByLabel("Fecha de agenda")).toBeVisible();
    await page.goto("/indicadores?date=2027-03-01");
    await expect(page.getByText("20 %", { exact: true })).toBeVisible();
    await expect(
      page.getByText("2 / 10 h habilitadas", { exact: true }),
    ).toBeVisible();
    await page.getByLabel("Aula", { exact: true }).selectOption("A");
    await expect(page.getByText("25 %", { exact: true })).toBeVisible();
    await page.screenshot({
      path: `/tmp/i053-summary-${width}.png`,
      fullPage: true,
    });
    fail = true;
    await page.getByLabel("Aula", { exact: true }).selectOption("");
    await expect(page.getByRole("alert")).toContainText(
      "Indicadores no disponibles",
    );
    await expect(page.getByText("20 %", { exact: true })).toHaveCount(0);
    fail = false;
    await page.getByRole("button", { name: "Reintentar consulta" }).click();
    await expect(page.getByText("20 %", { exact: true })).toBeVisible();
  });
test("cobertura, cero denominador, sin fechas y respuesta tardía distintos", async ({
  page,
}) => {
  await fakeAuth(page);
  await page.route("**/api/indicadores/resumen?*", async (r) => {
    const date = new URL(r.request().url()).searchParams.get("from");
    if (date === "2027-03-01")
      await new Promise((resolve) => setTimeout(resolve, 400));
    await r.fulfill({
      json: {
        ...summary,
        hours: 0,
        availableHours: 0,
        occupancy: null,
        classes: 0,
        demand: [],
        rooms: [],
        unknownCoverage: date === "2027-03-02",
        eligible: date !== "2027-03-03",
      },
    });
  });
  await page.goto("/");
  await login(page);
  await expect(page.getByLabel("Fecha de agenda")).toBeVisible();
  await page.goto("/indicadores?date=2027-03-04");
  await expect(
    page.getByText("Sin horas habilitadas", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Día", { exact: true }).fill("2027-03-02");
  await expect(page.getByText(/Cobertura histórica desconocida/)).toBeVisible();
  await page.getByLabel("Día", { exact: true }).fill("2027-03-01");
  await page.getByLabel("Día", { exact: true }).fill("2027-03-03");
  await expect(page.getByText(/Sin datos aplicables/)).toBeVisible();
  await page.waitForTimeout(500);
  await expect(page.getByText(/Sin datos aplicables/)).toBeVisible();
});
