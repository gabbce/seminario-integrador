import { test, expect, type Page } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
const password =
  process.env.AULAS_DEMO_PASSWORD ||
  readFileSync("../backend/.env", "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith("AULAS_DEMO_PASSWORD="))
    ?.slice("AULAS_DEMO_PASSWORD=".length)
    .replaceAll("\\\\", "\\");
// Revoke only each temporary browser session; preserve other signed-in sessions.
test.afterEach(async ({ page }) => {
  const token = await page
    .evaluate(
      () =>
        JSON.parse(localStorage.getItem("aulas-auth") || "null")?.access_token,
    )
    .catch(() => null);
  if (!token) return;
  const config = Object.fromEntries(
    readFileSync(".env.local", "utf8")
      .split(/\r?\n/)
      .filter((l) => l.includes("=") && !l.startsWith("#"))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i), l.slice(i + 1)];
      }),
  );
  const response = await fetch(
    config.VITE_SUPABASE_URL + "/auth/v1/logout?scope=local",
    {
      method: "POST",
      headers: {
        apikey: config.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: "Bearer " + token,
      },
    },
  );
  expect(response.ok, "Cierre de sesión temporal local").toBeTruthy();
});
async function login(page: Page, role = "bedel") {
  await page.goto("/");
  await page.getByLabel("Correo electrónico").fill(role + "@demo.local");
  await page.getByLabel("Contraseña", { exact: true }).fill(password!);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page.getByLabel("Fecha de agenda")).toBeVisible();
}
async function get(page: Page, path: string) {
  return page.evaluate(async (path) => {
    const token = JSON.parse(localStorage.getItem("aulas-auth")!).access_token;
    const r = await fetch("/api" + path, {
      headers: { Authorization: "Bearer " + token },
    });
    return { status: r.status, body: await r.json() };
  }, path);
}
test("fixtures exactos con PostgreSQL local y JWT Supabase real", async ({
  page,
  browserName,
}) => {
  mkdirSync("../artifacts/qa/exact", { recursive: true });
  await login(page);
  const summary = async (date: string, room = "", type = "") => {
    const r = await get(
      page,
      "/indicadores/resumen?" +
        new URLSearchParams({ from: date, to: date, room, type }),
    );
    expect(r.status).toBe(200);
    return r.body;
  };
  expect(await summary("2021-03-01", "A")).toMatchObject({
    hours: 2,
    availableHours: 8,
    occupancy: 25,
    unknownCoverage: false,
  });
  expect(await summary("2021-03-01")).toMatchObject({
    hours: 2,
    availableHours: 10,
    occupancy: 20,
  });
  expect(await summary("2021-03-02")).toMatchObject({ hours: 4, classes: 2 });
  const series = async (date: string, room = "") => {
    const r = await get(
      page,
      "/indicadores/serie?" +
        new URLSearchParams({ from: date, to: date, room, view: "day" }),
    );
    expect(r.status).toBe(200);
    return r.body;
  };
  const curves = await series("2021-03-03");
  expect(curves.studentHours).toBe(50);
  expect(
    curves.daily.slots
      .slice(14, 17)
      .map((s: { students: number }) => s.students),
  ).toEqual([30, 50, 20]);
  expect(
    curves.daily.slots.slice(14, 17).map((s: { classes: number }) => s.classes),
  ).toEqual([1, 2, 1]);
  expect((await series("2021-03-04")).studentHours).toBe(60);
  expect((await series("2021-03-05")).daily.peakClasses).toBe(1);
  expect(await summary("2021-03-08", "H")).toMatchObject({
    hours: 1.5,
    availableHours: 1.5,
  });
  expect(await summary("2021-03-08", "H", "General")).toMatchObject({
    hours: 1,
    availableHours: 1,
  });
  expect(await summary("2021-03-08", "H", "Multimedios")).toMatchObject({
    hours: 0.5,
    availableHours: 0.5,
  });
  expect(await summary("2021-03-09", "P")).toMatchObject({
    availableHours: 12.5,
    unknownCoverage: true,
    occupancy: null,
  });
  expect(await summary("2021-03-09", "Z")).toMatchObject({
    availableHours: 0,
    eligible: true,
    occupancy: null,
    unknownCoverage: false,
  });
  expect(await summary("2021-03-07")).toMatchObject({
    eligible: false,
    occupancy: null,
  });
  const week = await get(
    page,
    "/indicadores/serie?from=2021-04-05&to=2021-05-03&room=C&view=week",
  );
  expect(week.status).toBe(200);
  expect(week.body.weekly.week[0].dates).toEqual([
    "2021-04-05",
    "2021-04-12",
    "2021-04-19",
    "2021-04-26",
  ]);
  expect(week.body.weekly.week[0].slots[14].students).toBe(15);
  expect(week.body.weekly.week[0]).toMatchObject({
    peakStudents: 15,
    peakDateStudents: 40,
  });
  await page.goto("/indicadores?date=2021-03-01&room=A");
  await expect(
    page.getByText("2 / 8 h habilitadas", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("25 %", { exact: true })).toBeVisible();
  await page.screenshot({
    path: "../artifacts/qa/exact/weighted-" + browserName + ".png",
    fullPage: true,
  });
  await page.goto("/indicadores?date=2021-03-03");
  await expect(
    page.locator(".metric-volume strong").filter({ hasText: /^50$/ }),
  ).toBeVisible();
  await page.screenshot({
    path: "../artifacts/qa/exact/curves-" + browserName + ".png",
    fullPage: true,
  });
  await page.goto(
    "/indicadores?mode=week&from=2021-04-05&to=2021-05-03&room=C",
  );
  await expect(
    page.getByRole("button", {
      name: /Lunes 14:00–14:30: 15 alumnos previstos/,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /Lunes 14:00–14:30: 15 alumnos previstos/ })
    .focus();
  await page.keyboard.press("Enter");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "../artifacts/qa/exact/week-mobile-"+browserName+".png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/indicadores?date=2021-03-08&room=H&type=General");
  await expect(page.getByLabel("Aula", { exact: true })).toHaveValue("H");
  await expect(
    page.getByText("1 / 1 h habilitadas", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "../artifacts/qa/exact/history-"+browserName+".png",
    fullPage: true,
  });
  await page.goto("/indicadores?date=2021-03-09&room=P");
  await expect(page.getByText(/Cobertura histórica desconocida/)).toBeVisible();
  await page.screenshot({
    path: "../artifacts/qa/exact/partial-"+browserName+".png",
    fullPage: true,
  });
  await page.goto("/indicadores?date=2021-03-09&room=Z");
  await expect(
    page.getByText("Sin horas habilitadas", { exact: true }),
  ).toBeVisible();
  await page.goto("/indicadores?date=2021-03-07");
  await expect(
    page.getByText("Sin datos aplicables de apertura para la consulta.", {
      exact: true,
    }),
  ).toBeVisible();
});
test("Docente consulta fixture y recibe rechazo de indicadores", async ({
  page,
  browserName,
}) => {
  await login(page, "docente");
  await page.goto("/reservas?date=2021-03-03");
  await expect(page.locator(".screen-list tbody tr")).toHaveCount(2);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "../artifacts/qa/exact/teacher-mobile-" + browserName + ".png",
    fullPage: true,
  });
  expect(
    (await get(page, "/indicadores/resumen?from=2021-03-03&to=2021-03-03"))
      .status,
  ).toBe(403);
});
