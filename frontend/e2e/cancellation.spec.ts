import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { fakeAuth, login } from "./auth-fixture";
import type { Booking } from "../src/domain";

async function setup(page: Page, mode = "normal", role = "bedel") {
  await fakeAuth(page);
  const booking: Booking = {
    id: "42",
    version: 0,
    subject: "Actividad QA",
    course: "001-A-2027",
    teacher: "Laura Gómez",
    teacherEmail: "qa@example.test",
    students: 20,
    type: "General",
    registrant: { name: "Bedel QA", email: "bedel@example.test" },
    patterns: [{ day: 1, start: "14:00", end: "16:00", room: "103" }],
    schedule: { year: 2027, period: "first", excluded: [] },
    occurrences: [
      {
        id: "10",
        date: "2020-03-02",
        start: "14:00",
        end: "16:00",
        room: "103",
      },
      {
        id: "11",
        date: "2027-03-15",
        start: "14:00",
        end: "16:00",
        room: "103",
      },
      {
        id: "12",
        date: "2027-03-22",
        start: "14:00",
        end: "16:00",
        room: "105",
      },
    ],
  };
  await page.route("**/api/referencias/calendarios", (r) =>
    r.fulfill({
      json: [
        {
          id: "7",
          year: 2027,
          version: 0,
          state: "Habilitado",
          terms: {
            first: ["2027-03-01", "2027-06-30"],
            second: ["2027-08-02", "2027-11-30"],
          },
          holidays: [],
          descriptions: {},
        },
      ],
    }),
  );
  const control = {
    mode,
    requests: [] as {
      operationId: string;
      version: number;
      detailIds: string[];
      reason: string;
    }[],
    result: null as Record<string, unknown> | null,
  };
  await page.route("**/api/reservas/42", (r) => r.fulfill({ json: booking }));
  await page.route("**/api/reservas/42/cancelaciones/preparacion", (r) => {
    const body = r.request().postDataJSON();
    return r.fulfill({
      json: {
        ...body,
        count: body.detailIds.length,
        classes: booking.occurrences.filter((o) =>
          body.detailIds.includes(o.id),
        ),
        continuityCancelled: body.detailIds.length === 2,
      },
    });
  });
  await page.route("**/api/reservas/42/cancelaciones/confirmacion", (r) => {
    const body = r.request().postDataJSON();
    control.requests.push(body);
    if (control.mode === "conflict")
      return r.fulfill({
        status: 409,
        json: {
          code: "CONFLICT",
          message:
            "Una clase seleccionada ya comenzó. No se guardó ningún cambio.",
        },
      });
    if (control.mode === "lost-before") return r.abort();
    for (const o of booking.occurrences)
      if (body.detailIds.includes(o.id)) {
        o.cancelled = true;
        o.cancellation = {
          reason: body.reason,
          actor: "Bedel QA",
          at: "2026-09-25T12:00:00Z",
        };
      }
    booking.version = 1;
    control.result = {
      operationId: body.operationId,
      reservationId: "42",
      version: 1,
      detailIds: body.detailIds,
      state: "CONFIRMADA",
    };
    if (control.mode === "lost-after") return r.abort();
    return r.fulfill({ json: control.result });
  });
  await page.route("**/api/reservas/mutaciones/*", (r) =>
    r.fulfill({
      json: control.result
        ? { found: true, result: control.result }
        : { found: false },
    }),
  );
  await page.goto("/");
  await login(page, role);
  await expect(page.getByLabel("Fecha de agenda")).toBeVisible();
  await page.goto("/reservas/42");
  await expect(
    page.getByRole("heading", { name: "Actividad QA", exact: true }),
  ).toBeVisible();
  return control;
}
async function review(page: Page) {
  await page
    .getByRole("button", { name: "Cancelar clases", exact: true })
    .click();
  await expect(page.getByRole("checkbox").first()).toBeDisabled();
  await page.getByRole("button", { name: "Todas las futuras (2)" }).click();
  await expect(
    page.getByRole("button", { name: "Revisar cancelación", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("Motivo de cancelación")
    .fill("Actividad suspendida por organización");
  await page
    .getByRole("button", { name: "Revisar cancelación", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Revisar cancelación", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Se cancelará toda la continuidad futura", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("14:00–16:00 · Aula 105", { exact: true }),
  ).toBeVisible();
}
for (const width of [390, 1440]) {
  test(`cancelación completa revisión teclado recarga ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const control = await setup(page);
    await review(page);
    await page.screenshot({
      path: `/tmp/i042-review-${width}.png`,
      fullPage: true,
    });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page
      .getByRole("button", { name: "Confirmar cancelación", exact: true })
      .focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("heading", { name: "Cancelación confirmada" }),
    ).toBeVisible();
    expect(control.requests[0].detailIds).toEqual(["11", "12"]);
    await page.screenshot({
      path: `/tmp/i042-success-${width}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Ver detalle actualizado" }).click();
    await page.reload();
    await expect(
      page.getByText("Motivo: Actividad suspendida", { exact: false }),
    ).toHaveCount(2);
    await expect(
      page.getByRole("button", { name: "Cancelar clases", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText("Bedel QA · 25/9/26, 09:00", { exact: false }),
    ).toHaveCount(2);
    await page.screenshot({
      path: `/tmp/i042-history-${width}.png`,
      fullPage: true,
    });
    await expect(
      page.getByText("42 · CONFIRMADA", { exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
  });
  test(`cancelación conflicto conserva propuesta ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await setup(page, "conflict");
    await review(page);
    await page
      .getByRole("button", { name: "Confirmar cancelación", exact: true })
      .click();
    await expect(page.getByRole("alert")).toContainText(
      "No se guardó ningún cambio",
    );
    await expect(page.getByLabel("Motivo de cancelación")).toHaveValue(
      "Actividad suspendida por organización",
    );
    await expect(page.getByRole("checkbox").nth(1)).toBeChecked();
    await page.screenshot({
      path: `/tmp/i042-conflict-${width}.png`,
      fullPage: true,
    });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
  for (const mode of ["lost-before", "lost-after"]) {
    test(`cancelación ${mode} conserva UUID tras recarga ${width}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      const control = await setup(page, mode);
      await review(page);
      await page
        .getByRole("button", { name: "Confirmar cancelación", exact: true })
        .click();
      await expect(page.getByRole("alert")).toContainText(
        "No se pudo comprobar",
      );
      const first = control.requests[0];
      await page.reload();
      await expect(
        page.getByRole("button", { name: "Consultar resultado" }),
      ).toBeVisible();
      await page.screenshot({
        path: `/tmp/i042-${mode}-${width}.png`,
        fullPage: true,
      });
      await page.getByRole("button", { name: "Consultar resultado" }).click();
      if (mode === "lost-before") {
        await expect(page.getByRole("alert")).toContainText("no demuestra");
        control.mode = "normal";
        await page
          .getByRole("button", { name: "Reintentar misma cancelación" })
          .click();
        expect(control.requests[1]).toEqual(first);
      }
      await expect(
        page.getByRole("heading", { name: "Cancelación confirmada" }),
      ).toBeVisible();
      expect(control.requests).toHaveLength(mode === "lost-before" ? 2 : 1);
    });
  }
}
test("Docente solo consulta canceladas sin acciones", async ({ page }) => {
  await setup(page, "normal", "docente");
  await expect(
    page.getByRole("button", { name: "Cancelar clases", exact: true }),
  ).toHaveCount(0);
});

test("cancelación individual mantiene otras futuras y permite corregir revisión", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  const control = await setup(page);
  await page
    .getByRole("button", { name: "Cancelar clases", exact: true })
    .click();
  await page.getByRole("checkbox").nth(1).check();
  await page.getByLabel("Motivo de cancelación").fill("Una clase suspendida");
  await page
    .getByRole("button", { name: "Revisar cancelación", exact: true })
    .click();
  await expect(
    page.getByText("Se cancelará 1 clase", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Se cancelará toda la continuidad", { exact: false }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Corregir selección" }).click();
  await expect(page.getByRole("checkbox").nth(1)).toBeChecked();
  await page
    .getByRole("button", { name: "Revisar cancelación", exact: true })
    .click();
  await page.screenshot({ path: "/tmp/i042-single-390.png", fullPage: true });
  await page
    .getByRole("button", { name: "Confirmar cancelación", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Se canceló 1 clase", exact: true }),
  ).toBeVisible();
  expect(control.requests[0].detailIds).toEqual(["11"]);
  await page.getByRole("button", { name: "Ver detalle actualizado" }).click();
  await expect(
    page.getByText("1 próximas clases vigentes", { exact: false }),
  ).toBeVisible();
});
