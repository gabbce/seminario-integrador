import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { fakeAuth, login } from "./auth-fixture";
import type { Room } from "../src/domain";
for (const width of [390, 1440])
  test(`inventario persistente a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await fakeAuth(page);
    let rooms: Room[] = [];
    await page.route("**/api/aulas**", async (route) => {
      if (route.request().method() === "GET") {
        const filter = new URL(route.request().url()).searchParams.get("state");
        const items = rooms.filter((r) =>
          filter ? r.state === filter : r.state !== "Baja",
        );
        await route.fulfill({
          json: {
            items,
            total: items.length,
            page: 1,
            size: 20,
            enabled: rooms.filter((r) => r.state === "Habilitada").length,
          },
        });
        return;
      }
      const body = route.request().postDataJSON();
      const saved = {
        ...body,
        internalId: "1",
        version: (body.version ?? -1) + 1,
      };
      rooms = [saved];
      await route.fulfill({ json: saved });
    });
    await page.goto("/");
    await login(page, "bedel");
    await expect(page.getByLabel("Fecha de agenda")).toBeVisible();
    await page.goto("/aulas");
    await page.getByRole("button", { name: "Nueva aula", exact: true }).click();
    await page.getByLabel("Identificador", { exact: true }).fill("QA-101");
    await page
      .getByLabel("Ubicación / edificio", { exact: true })
      .fill("Edificio QA");
    await page
      .getByLabel("Tipo de aula", { exact: true })
      .selectOption("Laboratorio");
    await page
      .getByRole("button", { name: "Guardar aula", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Editar QA-101" }),
    ).toBeVisible();
    await page.reload();
    await page.getByRole("button", { name: "Editar QA-101" }).click();
    await expect(page.getByLabel("Tipo de aula", { exact: true })).toHaveValue(
      "Laboratorio",
    );
    await page.screenshot({
      path: `evidence/i023-aulas-${width}.png`,
      fullPage: true,
    });
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page
      .getByRole("button", { name: "Dar de baja", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Confirmar baja", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Editar QA-101" }),
    ).toHaveCount(0);
  });
