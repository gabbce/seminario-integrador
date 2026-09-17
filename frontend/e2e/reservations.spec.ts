import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { fakeAuth, login } from "./auth-fixture";

const calendar = {
  id: "7",
  year: 2027,
  version: 4,
  state: "Habilitado",
  terms: {
    first: ["2027-03-15", "2027-03-17"],
    second: ["2027-09-20", "2027-09-22"],
  },
  holidays: [],
  descriptions: {},
};
const inventory = Array.from({ length: 4 }, (_, index) => ({
  internalId: String(20 + index),
  id: `QA-${index + 1}`,
  version: 0,
  type: "Multimedios",
  capacity: 30 + index * 5,
  state: "Habilitada",
  location: "Edificio QA",
  floor: 1,
  board: "Fibrón",
  resources: [],
  history: [],
}));
async function setup(page: Page, role = "bedel") {
  await fakeAuth(page);
  await page.route("**/api/referencias/calendarios", (r) =>
    r.fulfill({ json: [calendar] }),
  );
  await page.route("**/api/referencias/aulas", (r) =>
    r.fulfill({ json: inventory }),
  );
  await page.route("**/api/referencias/cursos?*", (r) =>
    r.fulfill({
      json: [
        {
          id: "80",
          code: 1,
          subject: "Matemática QA",
          commission: "A",
          year: 2027,
        },
      ],
    }),
  );
  await page.route("**/api/referencias/docentes", (r) =>
    r.fulfill({
      json: [
        {
          id: "D-01",
          name: "Docente QA",
          ...(role !== "docente" ? { email: "qa@example.test" } : {}),
        },
      ],
    }),
  );
  const control = {
    fail: false,
    calls: 0,
    requests: [] as Record<string, unknown>[],
  };
  await page.route("**/api/reservas/periodicas/preparacion", async (r) => {
    control.calls++;
    const body = r.request().postDataJSON();
    control.requests.push(body);
    if (control.fail)
      return r.fulfill({
        status: 503,
        json: {
          code: "SERVICE_UNAVAILABLE",
          message: "No se pudo consultar. Intentá nuevamente.",
        },
      });
    const patterns = body.patterns.map(
      (pattern: { day: number; start: string; modules: number }) => {
        const date =
          body.period === "first"
            ? pattern.day === 1
              ? "2027-03-15"
              : "2027-03-17"
            : pattern.day === 1
              ? "2027-09-20"
              : "2027-09-22";
        const excluded = body.excluded.includes(date);
        const endMinutes =
          Number(pattern.start.slice(0, 2)) * 60 +
          Number(pattern.start.slice(3)) +
          pattern.modules * 30;
        return {
          day: pattern.day,
          start: pattern.start,
          end: `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`,
          dates: excluded ? [] : [date],
          omitted: excluded ? [{ date, reason: "Exclusión manual" }] : [],
          availableRooms: inventory,
          compatibleCount: 4,
        };
      },
    );
    return r.fulfill({ json: { year: 2027, calendarVersion: 4, patterns } });
  });
  await page.goto("/");
  await login(page, role);
  return control;
}

for (const width of [390, 1440])
  test(`preparación periódica usa respuesta API a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const control = await setup(page);
    await page.goto("/reservas/nueva");
    await expect(
      page.getByRole("heading", { name: "Nueva reserva periódica" }),
    ).toBeVisible();
    await page.getByLabel("Período", { exact: true }).selectOption("first");
    await page.getByRole("button", { name: "Buscar aulas" }).click();
    await expect(
      page.getByText("Aula QA-1", { exact: false }).first(),
    ).toBeVisible();
    expect(control.requests.at(-1)?.year).toBe(2027);
    expect(control.requests.at(-1)?.period).toBe("first");
    await page.screenshot({
      path: `/tmp/i031-aulas-${width}.png`,
      fullPage: true,
    });
    await expect(page.getByText("Aula QA-4", { exact: true })).toHaveCount(0);
    await page
      .getByRole("button", { name: "Ver todas (4)", exact: true })
      .first()
      .click();
    await page.getByRole("radio", { name: /Aula QA-4/ }).check();
    await page
      .getByRole("radio", { name: /Aula QA-1/ })
      .nth(1)
      .check();
    await page.getByRole("button", { name: "Revisar reserva" }).click();
    await expect(page.getByText("Ver las 2 fechas a registrar")).toBeVisible();
    await page.getByText("Ver las 2 fechas a registrar").click();
    await page.screenshot({
      path: `/tmp/i031-revision-${width}.png`,
      fullPage: true,
    });

    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
  });

test("fallo de disponibilidad conserva criterios y permite reintentar", async ({
  page,
}) => {
  const control = await setup(page);
  await page.goto("/reservas/nueva");
  control.fail = true;
  await page.getByLabel("Cantidad de alumnos prevista").fill("31");
  await expect(
    page.getByText("No se pudo consultar. Intentá nuevamente."),
  ).toBeVisible();
  await expect(page.getByLabel("Cantidad de alumnos prevista")).toHaveValue(
    "31",
  );
  control.fail = false;
  await page
    .getByRole("button", { name: /Reintentar|Buscar aulas/ })
    .first()
    .click();
  await expect.poll(() => control.calls).toBeGreaterThan(1);
});

test("docente consulta disponibilidad sin acciones de reserva", async ({
  page,
}) => {
  await setup(page, "docente");
  await page.goto("/disponibilidad");
  await page.getByRole("button", { name: "Buscar aulas" }).click();
  await expect(
    page.getByText("Aula QA-1", { exact: false }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Preparar reserva" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Confirmar reserva" }),
  ).toHaveCount(0);
});

test("exclusión total exige corregir y cambiar criterios invalida aulas elegidas", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/reservas/nueva");
  await page.getByLabel("Período", { exact: true }).selectOption("first");
  await page.getByText("Revisar fechas y exclusiones", { exact: true }).click();
  const firstDate = page.locator(".date-check input").first();
  await expect(firstDate).toBeChecked();
  await firstDate.uncheck();
  await page.getByRole("button", { name: "Buscar aulas" }).click();
  await expect(
    page.getByText(
      "Cada día semanal seleccionado debe tener al menos una clase futura. Ajustá el período, los días o las exclusiones.",
    ),
  ).toBeVisible();
  await firstDate.check();
  await page.getByRole("button", { name: "Buscar aulas" }).click();
  await page
    .getByRole("radio", { name: /Aula QA-1/ })
    .first()
    .check();
  await page
    .getByRole("radio", { name: /Aula QA-2/ })
    .nth(1)
    .check();
  await page.getByRole("button", { name: "Revisar reserva" }).click();
  await page.getByRole("button", { name: "Volver", exact: true }).click();
  await page.getByRole("button", { name: "Volver", exact: true }).click();
  await page.getByLabel("Cantidad de alumnos prevista").fill("32");
  await page.getByRole("button", { name: "Buscar aulas" }).click();
  await expect(page.locator('input[type="radio"]:checked')).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Revisar reserva" }),
  ).toBeDisabled();
});
