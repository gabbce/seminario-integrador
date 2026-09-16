import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { fakeAuth, login } from "./auth-fixture";
import type { PersistedCalendarConfig } from "../src/pages/PersistedCalendar";

for (const width of [390, 1440])
  test(`calendario persistente y errores a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await fakeAuth(page);
    let calendars: PersistedCalendarConfig[] = [];
    let stale = false;
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/api/referencias/calendarios", (route) =>
      route.fulfill({ json: calendars }),
    );
    await page.route("**/api/administracion/calendarios**", async (route) => {
      const request = route.request();
      if (request.method() === "POST") {
        const { year } = request.postDataJSON();
        if (calendars.some((calendar) => calendar.year === year)) {
          await route.fulfill({
            status: 409,
            json: { code: "CONFLICT", message: "El año ya existe." },
          });
          return;
        }
        const saved: PersistedCalendarConfig = {
          id: "101",
          year,
          version: 0,
          state: "En preparación",
          terms: { first: ["", ""], second: ["", ""] },
          holidays: [],
          descriptions: {},
        };
        calendars.push(saved);
        await route.fulfill({ status: 201, json: saved });
        return;
      }
      if (request.method() === "DELETE") {
        calendars = [];
        await route.fulfill({ status: 204 });
        return;
      }
      if (stale) {
        await route.fulfill({
          status: 409,
          json: {
            code: "CONFLICT",
            message: "El calendario cambió. Volvé a cargarlo antes de guardar.",
          },
        });
        return;
      }
      const body = request.postDataJSON();
      expect(Object.keys(body.descriptions).sort()).toEqual(
        [...body.holidays].sort(),
      );
      const saved = { ...body, version: body.version + 1 };
      calendars = [saved];
      await route.fulfill({ json: saved });
    });
    await page.goto("/");
    await login(page, "admin");
    await expect(
      page.getByRole("heading", { name: "8 de septiembre de 2026" }),
    ).toBeVisible();
    await page.goto("/administracion/calendario");
    await expect(
      page.getByText("No hay años lectivos registrados."),
    ).toBeVisible();
    await page.getByLabel("Nuevo año", { exact: true }).fill("2027");
    await page.getByRole("button", { name: "Crear año", exact: true }).click();
    await expect(
      page.getByLabel("Estado del año", { exact: true }),
    ).toHaveValue("En preparación");
    await page.getByLabel("Nuevo año", { exact: true }).fill("2027");
    await page.getByRole("button", { name: "Crear año", exact: true }).click();
    await expect(page.getByText("El año ya existe.")).toBeVisible();
    await page.getByLabel("Inicio 1", { exact: true }).fill("2027-03-01");
    await page.getByLabel("Fin 1", { exact: true }).fill("2027-07-01");
    await page.getByLabel("Inicio 2", { exact: true }).fill("2027-08-01");
    await page.getByLabel("Fin 2", { exact: true }).fill("2027-12-01");
    await page.getByLabel("Nueva fecha no lectiva").fill("2027-10-12");
    await page.getByLabel("Descripción nueva").fill("Fecha ficticia de prueba");
    await page
      .getByRole("button", { name: "Agregar fecha", exact: true })
      .click();
    await page
      .getByLabel("Estado del año", { exact: true })
      .selectOption("Habilitado");
    await page
      .getByRole("button", { name: "Guardar calendario", exact: true })
      .click();
    await expect(
      page.getByText("Calendario actualizado.", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByLabel("Estado del año", { exact: true }),
    ).toHaveValue("Habilitado");
    await expect(
      page.getByLabel("Descripción 2027-10-12", { exact: true }),
    ).toHaveValue("Fecha ficticia de prueba");
    await expect(
      page.getByRole("button", { name: "Revisar impacto", exact: true }),
    ).toHaveCount(0);
    await page.screenshot({
      path: `/tmp/i024-calendario-${width}.png`,
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
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    stale = true;
    await page
      .getByLabel("Descripción 2027-10-12", { exact: true })
      .fill("Cambio desactualizado");
    await page
      .getByRole("button", { name: "Guardar calendario", exact: true })
      .click();
    await expect(
      page.getByText(
        "El calendario cambió. Volvé a cargarlo antes de guardar.",
      ),
    ).toBeVisible();
    stale = false;
    await page
      .getByRole("button", { name: "Recargar calendario", exact: true })
      .click();
    await expect(
      page.getByLabel("Descripción 2027-10-12", { exact: true }),
    ).toHaveValue("Fecha ficticia de prueba");
    await page
      .getByRole("button", { name: "Quitar 2027-10-12", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Quitar cuatrimestre 2", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Guardar calendario", exact: true })
      .click();
    await expect(
      page.getByLabel("Estado del año", { exact: true }),
    ).toHaveValue("En preparación");
    await expect(page.getByLabel("Inicio 2", { exact: true })).toHaveValue("");
    await page
      .getByRole("button", { name: "Quitar cuatrimestre 1", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Guardar calendario", exact: true })
      .click();
    await expect(page.getByLabel("Inicio 1", { exact: true })).toHaveValue("");
    await page
      .getByRole("button", { name: "Eliminar año", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: "Confirmar eliminación de año",
        exact: true,
      })
      .click();
    await expect(
      page.getByText("No hay años lectivos registrados."),
    ).toBeVisible();
    await page.getByLabel("Nuevo año", { exact: true }).fill("2028");
    await page.getByRole("button", { name: "Crear año", exact: true }).click();
    await expect(page.getByLabel("Número de año", { exact: true })).toHaveValue(
      "2028",
    );
    await page
      .getByLabel("Estado del año", { exact: true })
      .selectOption("Cerrado");
    await page
      .getByRole("button", { name: "Guardar calendario", exact: true })
      .click();
    await expect(
      page.getByLabel("Estado del año", { exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Eliminar año", exact: true }),
    ).toBeDisabled();
    expect(errors).toEqual([]);
  });
