import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { fakeAuth, login } from "./auth-fixture";
import { initialCalendar } from "../src/calendar";
import { rooms } from "../src/domain";
import type { Course } from "../src/catalog";
for (const width of [390, 1440])
  test(`referencias persistentes a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await fakeAuth(page);
    let courses: Course[] = [];
    await page.route("**/api/referencias/calendarios", (r) =>
      r.fulfill({ json: [{ ...initialCalendar, id: "1" }] }),
    );
    await page.route("**/api/referencias/aulas", (r) =>
      r.fulfill({ json: rooms }),
    );
    await page.route("**/api/referencias/docentes", (r) =>
      r.fulfill({
        json: [
          {
            id: "D-99",
            name: "Docente servido por Java",
            email: "docente@example.test",
          },
        ],
      }),
    );
    await page.route("**/api/referencias/cursos**", async (r) => {
      if (r.request().method() === "GET") return r.fulfill({ json: courses });
      const body = r.request().postDataJSON();
      const course = {
        id: "101",
        code: 7,
        subject: body.subject.trim(),
        commission: body.commission.trim().toUpperCase(),
        year: body.year,
      };
      courses = [course];
      await r.fulfill({ json: course });
    });
    await page.goto("/");
    await login(page);
    await page.goto("/reservas/nueva");
    await page
      .getByRole("button", { name: "Crear curso", exact: true })
      .click();
    await page
      .getByLabel("Nombre de materia", { exact: true })
      .fill("  Materia de prueba  ");
    await page.getByLabel("Comisión", { exact: true }).fill(" a ");
    await page
      .getByRole("button", { name: "Guardar curso y seleccionar", exact: true })
      .click();
    await expect(page.getByLabel("Curso", { exact: true })).toHaveValue("101");
    await expect(
      page.getByRole("option", { name: "Materia de prueba · 007-A-2026" }),
    ).toHaveCount(1);
    await expect(
      page.getByRole("option", { name: "Docente servido por Java" }),
    ).toHaveCount(1);
    await page.reload();
    await expect(page.getByLabel("Curso", { exact: true })).toHaveValue("101");
    await page.screenshot({
      path: `evidence/i025-referencias-${width}.png`,
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
  });
