import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { fakeAuth, login } from "./auth-fixture";

async function setup(page: Page, role = "admin") {
  await fakeAuth(page);
  let calendar = {
    id: "7",
    year: 2027,
    version: 0,
    state: "Habilitado",
    terms: {
      first: ["2027-03-08", "2027-07-02"],
      second: ["2027-08-02", "2027-11-26"],
    },
    holidays: ["2027-06-21"],
    descriptions: { "2027-06-21": "Feriado QA" },
  };
  const control = {
    mode: "normal",
    requests: [] as Record<string, unknown>[],
    preparations: 0,
  };
  let result: unknown;
  await page.route("**/api/referencias/calendarios", (r) =>
    r.fulfill({ json: [calendar] }),
  );
  await page.route("**/api/administracion/calendarios/**", async (r) => {
    const path = new URL(r.request().url()).pathname;
    if (path.includes("/operaciones/"))
      return r.fulfill({ json: { found: !!result, result } });
    const body = r.request().postDataJSON();
    if (path.endsWith("/impacto")) {
      control.preparations++;
      if (body.version !== calendar.version)
        return r.fulfill({
          status: 409,
          json: {
            message: "La versión del calendario cambió. Recargá el calendario.",
          },
        });
      return r.fulfill({
        json: {
          calendar: body,
          stamp: "b".repeat(64),
          canConfirm: control.mode !== "conflict",
          added: [
            {
              booking: "42",
              pattern: "8",
              date: "2027-07-05",
              start: "14:00",
              end: "16:00",
              room: "103",
              roomId: "3",
              modules: 4,
            },
          ],
          conflicts:
            control.mode === "conflict"
              ? [
                  {
                    booking: "42",
                    date: "2027-07-05",
                    room: "103",
                    reason: "El aula del patrón está ocupada.",
                    alternatives: ["105"],
                    occupants: [
                      {
                        reservation: "43",
                        subject: "Matemática QA",
                        teacher: "Laura Gómez",
                        teacherEmail: "laura@example.test",
                        registrantEmail: "bedel@example.test",
                        start: "14:00",
                        end: "15:00",
                      },
                    ],
                  },
                ]
              : [],
        },
      });
    }
    if (path.endsWith("/confirmacion")) {
      control.requests.push(body);
      if (control.mode === "stale") {
        calendar = { ...calendar, version: calendar.version + 1 };
        return r.fulfill({
          status: 409,
          json: {
            message:
              "El impacto cambió. No se guardó ningún cambio; revisá nuevamente.",
          },
        });
      }
      if (control.mode === "lost-before") return r.abort("failed");
      calendar = { ...body.proposal, id: "7", version: calendar.version + 1 };
      result = { operationId: body.operationId, calendar };
      if (control.mode === "lost-after") return r.abort("failed");
      return r.fulfill({ json: result });
    }
    return r.fulfill({ status: 404, json: {} });
  });
  await page.goto("/");
  await login(page, role);
  await expect(page.getByLabel("Fecha de agenda")).toBeVisible();
  await page.goto("/administracion/calendario");
  return control;
}
async function review(page: Page) {
  await page.getByLabel("Fin 1", { exact: true }).fill("2027-07-09");
  await page
    .getByRole("button", { name: "Revisar impacto", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Impacto del cambio" }),
  ).toBeVisible();
}
for (const width of [390, 1440]) {
  test(`calendario impacto éxito y teclado ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const c = await setup(page);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await review(page);
    expect(c.requests).toHaveLength(0);
    await page.screenshot({
      path: `../artifacts/qa/screens/i045-review-${width}.png`,
      fullPage: true,
    });
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    const button = page.getByRole("button", {
      name: "Confirmar cambio de calendario",
    });
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByText("Calendario y clases actualizados.", { exact: true }),
    ).toBeVisible();
    expect(c.requests).toHaveLength(1);
    expect(c.requests[0].stamp).toBe("b".repeat(64));
    await page.reload();
    await expect(page.getByLabel("Fin 1", { exact: true })).toHaveValue(
      "2027-07-09",
    );
    await page.screenshot({
      path: `../artifacts/qa/screens/i045-success-${width}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
  });
  test(`calendario interferencias informativas bloquean conjunto ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const c = await setup(page);
    c.mode = "conflict";
    await review(page);
    await expect(
      page.getByRole("button", { name: "Confirmar cambio de calendario" }),
    ).toBeDisabled();
    await expect(
      page.getByText(/Aulas compatibles libres en ese horario: 105/),
    ).toBeVisible();
    await expect(page.getByText(/laura@example.test/)).toBeVisible();
    await page.screenshot({
      path: `../artifacts/qa/screens/i045-conflict-${width}.png`,
      fullPage: true,
    });
    expect(
      (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
        .violations,
    ).toEqual([]);
    expect(c.requests).toHaveLength(0);
    c.mode = "normal";
    await page
      .getByRole("button", { name: "Revisar impacto", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Confirmar cambio de calendario" }),
    ).toBeEnabled();
  });
  test(`calendario versión obsoleta conserva propuesta ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const c = await setup(page);
    await review(page);
    c.mode = "stale";
    await page
      .getByRole("button", { name: "Confirmar cambio de calendario" })
      .click();
    await expect(page.getByText(/El impacto cambió/).first()).toBeVisible();
    await expect(page.getByLabel("Fin 1", { exact: true })).toHaveValue(
      "2027-07-09",
    );
    await page.screenshot({
      path: `../artifacts/qa/screens/i045-stale-${width}.png`,
      fullPage: true,
    });
    c.mode = "normal";
    await page.getByRole("button", { name: "Recargar calendario" }).click();
    await expect(page.getByLabel("Fin 1", { exact: true })).toHaveValue(
      "2027-07-09",
    );
    await review(page);
    await page
      .getByRole("button", { name: "Confirmar cambio de calendario" })
      .click();
    await expect(
      page.getByText("Calendario y clases actualizados.", { exact: true }),
    ).toBeVisible();
    expect(c.requests[0].operationId).not.toBe(c.requests[1].operationId);
    expect((c.requests[1].proposal as { version: number }).version).toBe(1);
  });
  for (const mode of ["lost-before", "lost-after"])
    test(`calendario ${mode} recuperación tras recarga ${width}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      const c = await setup(page);
      await review(page);
      c.mode = mode;
      await page
        .getByRole("button", { name: "Confirmar cambio de calendario" })
        .click();
      await expect(
        page.getByRole("heading", { name: "Comprobar cambio de calendario" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Consultar resultado" }),
      ).toBeEnabled();
      await page.reload();
      await expect(
        page.getByRole("button", { name: "Consultar resultado" }),
      ).toBeEnabled();
      await page.screenshot({
        path: `../artifacts/qa/screens/i045-${mode}-${width}.png`,
        fullPage: true,
      });
      if (mode === "lost-after")
        await page.getByRole("button", { name: "Consultar resultado" }).click();
      else {
        await page.getByRole("button", { name: "Consultar resultado" }).click();
        await expect(page.getByText(/Todavía no hay resultado/)).toBeVisible();
        c.mode = "normal";
        await page
          .getByRole("button", { name: "Reintentar mismo cambio" })
          .click();
        expect(c.requests[1]).toEqual(c.requests[0]);
      }
      await expect(
        page.getByText("Calendario y clases actualizados.", { exact: true }),
      ).toBeVisible();
    });
}
for (const role of ["bedel", "docente"])
  test(`calendario impacto no visible para ${role}`, async ({ page }) => {
    const c = await setup(page, role);
    await expect(page.getByLabel("Fecha de agenda")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Calendario académico" }),
    ).toHaveCount(0);
    expect(c.preparations).toBe(0);
  });
