import { test, expect } from "@playwright/test";
import { fakeAuth, login } from "./auth-fixture";
import type { ConsultationRow } from "../src/consultations";

const roomIds = Array.from({ length: 12 }, (_, i) => String(101 + i));
const rooms = roomIds.map((id) => ({
  id,
  type: "General",
  capacity: 40,
  state: "Habilitada",
  history: [{ at: "2027-01-01T00:00", state: "Habilitada", type: "General" }],
}));
// Odd rooms hold Álgebra (course 8, Laura Gómez); even rooms hold Física (course 9, Ana Ruiz).
const rows: ConsultationRow[] = roomIds.map((room, i) => ({
  id: String(i + 1),
  bookingId: String(900 + i),
  courseId: i % 2 ? "8" : "9",
  course: i % 2 ? "001-A-2027" : "002-B-2027",
  subject: i % 2 ? "Álgebra" : "Física",
  teacher: i % 2 ? "Laura Gómez" : "Ana Ruiz",
  students: 30,
  date: "2027-03-01",
  start: "08:00",
  // 30-minute, one-hour and two-hour classes exercise the three block layouts.
  end: ["08:30", "09:00", "10:00"][i % 3],
  room,
  type: "General",
  cancelled: false,
}));

test("agenda diaria pagina aulas sin desplazamiento lateral y filtra por curso y docente", async ({
  page,
}) => {
  await fakeAuth(page);
  const requests: URLSearchParams[] = [];
  await page.route("**/api/referencias/aulas", (r) =>
    r.fulfill({ json: rooms }),
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
  await page.route("**/api/referencias/cursos?*", (r) =>
    r.fulfill({
      json: [
        { id: "8", code: 1, subject: "Álgebra", commission: "A", year: 2027 },
        { id: "9", code: 2, subject: "Física", commission: "B", year: 2027 },
      ],
    }),
  );
  await page.route("**/api/referencias/docentes", (r) =>
    r.fulfill({
      json: [
        { id: "D-01", name: "Laura Gómez" },
        { id: "D-02", name: "Ana Ruiz" },
      ],
    }),
  );
  await page.route("**/api/consultas/agenda?*", (r) => {
    const q = new URL(r.request().url()).searchParams;
    requests.push(q);
    const course = q.get("courseId");
    const teacher = q.get("teacher");
    const found = rows.filter(
      (x) =>
        (!course || x.courseId === course) &&
        (!teacher ||
          x.teacher === (teacher === "D-01" ? "Laura Gómez" : "Ana Ruiz")),
    );
    return r.fulfill({
      json: { rows: found, total: found.length, page: 0, size: 0, filters: {} },
    });
  });
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/");
  await login(page);
  await page.getByLabel("Fecha de agenda").fill("2027-03-01");
  const grid = page.getByRole("region", { name: "Agenda diaria por aulas" });
  const heads = grid.locator(".room-head strong");
  await expect(grid.locator(".booking").first()).toBeVisible();

  // Twelve rooms do not fit at 1366 px: the grid pages them instead of scrolling sideways.
  const pager = page.getByRole("navigation", { name: "Páginas de aulas" });
  await expect(pager).toContainText("Aulas 1–");
  await expect(pager).toContainText("de 12");
  await expect(pager).toContainText("clases en otras páginas");
  expect(await grid.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
  await expect(heads.first()).toHaveText("Aula 101");
  await pager.getByRole("button", { name: "Aulas siguientes" }).click();
  await expect(heads.first()).not.toHaveText("Aula 101");
  await expect(page).toHaveURL(/aulas=2/);
  await page.screenshot({
    path: "../artifacts/qa/screens/agenda-paginada-desktop.png",
  });
  await grid.screenshot({
    path: "../artifacts/qa/screens/agenda-grilla-compacta.png",
  });
  expect(await grid.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );

  // A course keeps only its rooms and classes, says so, and starts again at the first page.
  await page.getByLabel("Filtrar curso").selectOption("8");
  await expect(
    page.getByText(
      "Mostrando solo las clases de Álgebra 001-A-2027. Los espacios vacíos no indican aulas libres.",
    ),
  ).toBeVisible();
  await expect.poll(() => requests.at(-1)?.get("courseId")).toBe("8");
  await expect(page).not.toHaveURL(/aulas=/);
  await expect(heads.first()).toHaveText("Aula 102");
  await expect(grid.locator(".booking", { hasText: "Física" })).toHaveCount(0);
  await page.screenshot({
    path: "../artifacts/qa/screens/agenda-filtro-curso-desktop.png",
  });
  await expect(
    grid.locator(".booking", { hasText: "Álgebra" }),
  ).not.toHaveCount(0);

  // On a phone the daily list shows the same filtered classes without horizontal scroll.
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".mobile-booking")).toHaveCount(6);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 1366, height: 768 });

  // Course and teacher combine; no matching classes is an empty result, not an error.
  await page.getByLabel("Filtrar docente").selectOption("D-02");
  await expect.poll(() => requests.at(-1)?.get("teacher")).toBe("D-02");
  expect(requests.at(-1)?.get("courseId")).toBe("8");
  await expect(
    grid.getByText("No hay clases para estos filtros en esta fecha."),
  ).toBeVisible();
  await page.getByLabel("Filtrar curso").selectOption("");
  await expect(grid.locator(".booking", { hasText: "Física" })).not.toHaveCount(
    0,
  );
  await expect(grid.locator(".booking", { hasText: "Álgebra" })).toHaveCount(0);
});
