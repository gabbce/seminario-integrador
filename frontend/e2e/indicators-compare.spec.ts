import { test, expect } from "@playwright/test";
import { fakeAuth, login } from "./auth-fixture";

const week = (dates: number, peakStudents: number, peakClasses: number) => ({
  eligible: true,
  peakStudents,
  peakClasses,
  week: [1, 2, 3, 4, 5].map((day) => ({
    day,
    dates: Array.from({ length: dates }, (_, i) => `2027-01-${10 + i}`),
    slots: [],
    studentHours: null,
    classes: null,
    peakStudents: null,
    peakClasses: null,
    peakDateStudents: null,
  })),
});
// A: 20 eligible days, 40 h, 20 classes, 600 student-hours. B: 30 days, 90 h, 30 classes, 1200 student-hours.
const periods = {
  a: {
    occupancy: 20,
    hours: 40,
    classes: 20,
    studentHours: 600,
    week: week(4, 50, 3),
  },
  b: {
    occupancy: 25.5,
    hours: 90,
    classes: 30,
    studentHours: 1200,
    week: week(6, 45, 4),
  },
};

test("indicadores filtran aulas por atributos y comparan dos períodos", async ({
  page,
}) => {
  await fakeAuth(page);
  const requests: URLSearchParams[] = [];
  await page.route("**/api/referencias/aulas", (r) =>
    r.fulfill({
      json: [
        {
          id: "101",
          type: "General",
          capacity: 40,
          state: "Habilitada",
          location: "Norte",
          floor: 1,
        },
        {
          id: "201",
          type: "Multimedios",
          capacity: 90,
          state: "Habilitada",
          location: "Sur",
          floor: 2,
          resources: ["projector"],
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
          descriptions: {},
        },
      ],
    }),
  );
  await page.route("**/api/indicadores/serie?*", (r) => {
    const q = new URL(r.request().url()).searchParams;
    requests.push(q);
    const unknown = q.get("from")?.startsWith("2026");
    const p = q.get("from") === "2027-08-01" || unknown ? periods.b : periods.a;
    return r.fulfill({
      json: {
        summary: {
          from: q.get("from"),
          to: q.get("to"),
          room: "",
          type: "",
          hours: p.hours,
          availableHours: 200,
          occupancy: unknown ? null : p.occupancy,
          classes: p.classes,
          unknownCoverage: !!unknown,
          eligible: true,
          forecast: false,
          demand: [],
          rooms: [],
        },
        daily: null,
        weekly: p.week,
        studentHours: p.studentHours,
      },
    });
  });
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto("/");
  await login(page);
  await expect(page.getByLabel("Fecha de agenda")).toBeVisible();
  await page.goto("/indicadores?date=2027-03-01");

  // Room attributes travel to the API for the same set of rooms (DA-87).
  await page.getByLabel("Edificio").selectOption("Norte");
  await expect.poll(() => requests.at(-1)?.get("location")).toBe("Norte");
  // The checkbox follows the URL, which the router updates asynchronously.
  await page.getByLabel("Proyector").click();
  await expect(page.getByLabel("Proyector")).toBeChecked();
  await expect.poll(() => requests.at(-1)?.get("resources")).toBe("projector");
  const before = requests.length;
  await page.getByLabel("Capacidad mínima (personas)").fill("50");
  await page.getByLabel("Capacidad máxima (personas)").fill("40");
  await expect(
    page.getByText("La capacidad máxima no puede ser menor que la mínima."),
  ).toBeVisible();
  await page.getByLabel("Capacidad máxima (personas)").fill("");
  await page.getByLabel("Capacidad mínima (personas)").fill("");
  await page.getByLabel("Proyector").click();
  await expect(page.getByLabel("Proyector")).not.toBeChecked();
  expect(
    requests
      .slice(before)
      .some(
        (q) => q.get("minCapacity") === "50" && q.get("maxCapacity") === "40",
      ),
  ).toBe(false);

  // Two terms side by side: per eligible day and percentage points, never raw totals (DA-88).
  await page.getByRole("button", { name: "Comparar períodos" }).click();
  await page.getByLabel("Período A").selectOption("2027:first");
  await page.getByLabel("Período B").selectOption("2027:second");
  const table = page.getByRole("region", { name: "Comparación de períodos" });
  const row = (name: string) =>
    table
      .getByRole("row")
      .filter({ has: page.getByRole("rowheader", { name }) });
  await expect(row("Ocupación")).toContainText("20 %");
  await expect(row("Ocupación")).toContainText("25,5 %");
  await expect(row("Ocupación")).toContainText("+5,5 p. p.");
  await expect(row("Horas reservadas por día hábil")).toContainText("+1 h");
  await expect(row("Clases por día hábil")).toContainText("1");
  await expect(row("Alumnos-hora por día hábil")).toContainText("+10");
  await expect(row("Pico promedio de alumnos simultáneos")).toContainText("−5");
  await expect(row("Días hábiles considerados")).toContainText("20");
  await expect(row("Días hábiles considerados")).toContainText("30");
  const pair = requests.slice(-2);
  // Quick successive edits do not overwrite each other: both capacities were cleared.
  expect(
    pair.every((q) => !q.has("minCapacity") && !q.has("maxCapacity")),
  ).toBe(true);
  await expect(page.getByLabel("Capacidad máxima (personas)")).toHaveValue("");
  expect(pair.map((q) => q.get("view"))).toEqual(["week", "week"]);
  expect(pair.every((q) => q.get("location") === "Norte")).toBe(true);
  await page.screenshot({
    path: "../artifacts/qa/screens/indicadores-comparacion-desktop.png",
    fullPage: true,
  });

  // Unknown coverage in one period: no occupancy and no difference for it.
  await page.getByLabel("Período B").selectOption("custom");
  await page.getByLabel("Desde (B)").fill("2026-03-01");
  await page.getByLabel("Hasta (B)").fill("2026-07-01");
  await expect(row("Ocupación")).toContainText("—");
  await expect(
    table.getByText("Período B: cobertura histórica desconocida."),
  ).toBeVisible();
  // With no occupancy in either period, the row says nothing and is left out.
  await page.getByLabel("Período A").selectOption("custom");
  await page.getByLabel("Desde", { exact: true }).fill("2026-03-01");
  await page.getByLabel("Hasta", { exact: true }).fill("2026-07-01");
  await expect(row("Ocupación")).toHaveCount(0);
  await expect(row("Horas reservadas por día hábil")).toHaveCount(1);

  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
