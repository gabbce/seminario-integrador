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
    await page.route("**/api/indicadores/serie?*", async (r) => {
      const p = new URL(r.request().url()).searchParams;
      if (fail)
        return r.fulfill({
          status: 503,
          json: { message: "Indicadores no disponibles" },
        });
      await r.fulfill({
        json: {
          daily: null,
          weekly: null,
          studentHours: 0,
          summary: {
            ...summary,
            ...(p.get("room") === "A"
              ? {
                  availableHours: 8,
                  occupancy: 25,
                  demand: [
                    {
                      label: "General",
                      hours: 2,
                      availableHours: 8,
                      classes: 1,
                    },
                  ],
                  rooms: [
                    { label: "A", hours: 2, availableHours: 8, classes: 1 },
                  ],
                }
              : {}),
          },
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
      path: `../artifacts/qa/screens/i053-summary-${width}.png`,
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
  await page.route("**/api/indicadores/serie?*", async (r) => {
    const date = new URL(r.request().url()).searchParams.get("from");
    if (date === "2027-03-01")
      await new Promise((resolve) => setTimeout(resolve, 400));
    await r.fulfill({
      json: {
        daily: null,
        weekly: null,
        studentHours: 0,
        summary: {
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
  // Without a computable occupancy its card is left out; the notice says why.
  await expect(
    page.getByRole("region", { name: "Resumen de indicadores" }),
  ).not.toContainText("Ocupación");
  await page.getByLabel("Día", { exact: true }).fill("2027-03-02");
  await expect(page.getByText(/Cobertura histórica desconocida/)).toBeVisible();
  await page.getByLabel("Día", { exact: true }).fill("2027-03-01");
  await page.getByLabel("Día", { exact: true }).fill("2027-03-03");
  await expect(page.getByText(/Sin datos aplicables/)).toBeVisible();
  await page.waitForTimeout(500);
  await expect(page.getByText(/Sin datos aplicables/)).toBeVisible();
});

test("curvas diarias y semana típica presentan datos autoritativos", async ({
  page,
}) => {
  await fakeAuth(page);
  const slots = Array.from({ length: 32 }, (_, i) => ({
    start: `${String(7 + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`,
    end: `${String(7 + Math.floor((i + 1) / 2)).padStart(2, "0")}:${(i + 1) % 2 ? "30" : "00"}`,
    students: [14, 15, 16].includes(i) ? [30, 50, 20][i - 14] : 0,
    classes: [14, 15, 16].includes(i) ? [1, 2, 1][i - 14] : 0,
  }));
  await page.route("**/api/indicadores/serie?*", (r) => {
    const params = new URL(r.request().url()).searchParams;
    const weekly = params.get("view") === "week";
    return r.fulfill({
      json: {
        summary: {
          ...summary,
          from: params.get("from"),
          to: params.get("to"),
          classes: 2,
        },
        studentHours: weekly ? 30 : 50,
        daily: weekly
          ? null
          : {
              date: "2027-03-01",
              slots,
              peakStudents: 50,
              peakClasses: 2,
              peakStudentSlots: ["14:30–15:00"],
              peakClassSlots: ["14:30–15:00"],
              studentHours: 50,
              classes: 2,
            },
        weekly: weekly
          ? {
              eligible: true,
              peakStudents: 15,
              peakClasses: 0.5,
              week: [1, 2, 3, 4, 5].map((day) => ({
                day,
                dates:
                  day === 1
                    ? ["2027-03-01", "2027-03-08", "2027-03-15", "2027-03-22"]
                    : [],
                slots: slots.map((s) => ({
                  ...s,
                  students:
                    day === 1 && s.start === "14:00"
                      ? 15
                      : day === 1
                        ? 0
                        : null,
                  classes:
                    day === 1 && s.start === "14:00"
                      ? 0.5
                      : day === 1
                        ? 0
                        : null,
                })),
                studentHours: day === 1 ? 7.5 : null,
                classes: day === 1 ? 0.5 : null,
                peakStudents: day === 1 ? 15 : null,
                peakClasses: day === 1 ? 0.5 : null,
                peakDateStudents: day === 1 ? 40 : null,
              })),
            }
          : null,
      },
    });
  });
  await page.goto("/");
  await login(page);
  await expect(page.getByLabel("Fecha de agenda")).toBeVisible();
  await page.goto("/indicadores?date=2027-03-01");
  await expect(
    page.getByRole("img", { name: /Alumnos previstos. Pico 50/ }),
  ).toBeVisible();
  await page.getByLabel("Franja del día").selectOption("15");
  await expect(page.getByRole("status")).toContainText(
    "50 alumnos previstos · 2 clases simultáneas",
  );
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.screenshot({
    path: "../artifacts/qa/screens/i054-curves.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Semana típica", exact: true })
    .click();
  await page.getByLabel("Hasta", { exact: true }).fill("2027-03-29");
  await page.getByLabel("Desde", { exact: true }).fill("2027-03-01");
  await expect(
    page.getByText("Rango consultado: 2027-03-01 — 2027-03-29"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: /Lunes 14:00–14:30: 15 alumnos previstos/,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /Lunes 14:00–14:30: 15 alumnos previstos/ })
    .focus();
  await expect(page.locator(".heat-selection")).toContainText(
    "4 fechas aportantes",
  );
  await expect(page.locator(".weekly-comparison")).toContainText("40");
  await page.screenshot({
    path: "../artifacts/qa/screens/i054-week.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "../artifacts/qa/screens/i054-week-mobile.png",
    fullPage: true,
  });
});
