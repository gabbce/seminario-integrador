import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
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
    courseId: "8",
    teacher: "Laura Gómez",
    teacherId: "D-01",
    teacherEmail: "qa@example.test",
    students: 20,
    type: "General",
    board: "Tiza",
    resources: ["fans"],
    registrant: { name: "Bedel QA", email: "bedel@example.test" },
    occurrences: [
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
  await page.route("**/api/referencias/cursos?*", (r) =>
    r.fulfill({
      json: [
        {
          id: "8",
          code: 1,
          subject: "Actividad QA",
          commission: "A",
          year: 2027,
        },
        {
          id: "9",
          code: 2,
          subject: "Otra materia QA",
          commission: "B",
          year: 2027,
        },
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
  const control = {
    mode,
    requests: [] as Record<string, unknown>[],
    result: null as Record<string, unknown> | null,
  };
  await page.route("**/api/reservas/42", (r) => r.fulfill({ json: booking }));
  await page.route("**/api/reservas/42/cabecera", (r) => {
    const body = r.request().postDataJSON();
    control.requests.push(body);
    if (control.mode === "conflict")
      return r.fulfill({
        status: 409,
        json: {
          message:
            "Las aulas 103, 105 no cumplen los nuevos requisitos. No se guardó ningún cambio.",
          code: "CONFLICT",
        },
      });
    if (control.mode === "lost-before") return r.abort();
    Object.assign(booking, {
      teacher: "Ana Ruiz",
      teacherId: "D-02",
      students: body.students,
      version: 1,
      changes: [
        {
          at: "2026-09-25T12:00:00Z",
          actor: "Bedel QA",
          description:
            "Datos compartidos: alumnos 20 → 25; docente Laura Gómez → Ana Ruiz",
        },
      ],
    });
    control.result = {
      operationId: body.operationId,
      reservationId: "42",
      version: 1,
      at: "2026-09-25T12:00:00Z",
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
async function edit(page: Page) {
  await page
    .getByRole("button", { name: "Modificar datos", exact: true })
    .click();
  await page.getByLabel("Alumnos previstos", { exact: true }).fill("25");
  await page.getByLabel("Docente", { exact: true }).selectOption("Ana Ruiz");
}
for (const width of [390, 1440]) {
  test(`cabecera edición historial teclado recarga ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const control = await setup(page);
    await edit(page);
    await page.screenshot({
      path: `../artifacts/qa/screens/i043a-form-${width}.png`,
      fullPage: true,
    });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page
      .getByRole("button", { name: "Guardar datos", exact: true })
      .focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("heading", {
        name: "Datos de la reserva actualizados",
        exact: true,
      }),
    ).toBeVisible();
    expect(control.requests[0]).toMatchObject({
      students: 25,
      teacherId: "D-02",
      version: 0,
      courseId: "8",
    });
    await page.screenshot({
      path: `../artifacts/qa/screens/i043a-success-${width}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Ver detalle actualizado" }).click();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Historial de cambios", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Datos compartidos: alumnos 20 → 25", { exact: false }),
    ).toBeVisible();
    await page.screenshot({
      path: `../artifacts/qa/screens/i043a-history-${width}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
  test(`cabecera incompatible conserva formulario ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await setup(page, "conflict");
    await edit(page);
    await page
      .getByRole("button", { name: "Guardar datos", exact: true })
      .click();
    await expect(page.getByRole("alert")).toContainText("no cumplen");
    await expect(
      page.getByLabel("Alumnos previstos", { exact: true }),
    ).toHaveValue("25");
    await expect(page.getByLabel("Docente", { exact: true })).toHaveValue(
      "Ana Ruiz",
    );
    await page.screenshot({
      path: `../artifacts/qa/screens/i043a-conflict-${width}.png`,
      fullPage: true,
    });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
  for (const mode of ["lost-before", "lost-after"]) {
    test(`cabecera ${mode} recupera misma operación ${width}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      const control = await setup(page, mode);
      await edit(page);
      await page
        .getByRole("button", { name: "Guardar datos", exact: true })
        .click();
      await expect(page.getByRole("alert")).toContainText(
        "No se pudo comprobar",
      );
      const first = control.requests[0];
      await page.reload();
      await expect(
        page.getByRole("heading", {
          name: "Comprobar modificación",
          exact: true,
        }),
      ).toBeVisible();
      await page.screenshot({
        path: `../artifacts/qa/screens/i043a-${mode}-${width}.png`,
        fullPage: true,
      });
      await page.getByRole("button", { name: "Consultar resultado" }).click();
      if (mode === "lost-before") {
        await expect(page.getByRole("alert")).toContainText("no demuestra");
        control.mode = "normal";
        await page
          .getByRole("button", { name: "Reintentar misma modificación" })
          .click();
        expect(control.requests[1]).toEqual(first);
      }
      await expect(
        page.getByRole("heading", {
          name: "Datos de la reserva actualizados",
          exact: true,
        }),
      ).toBeVisible();
    });
  }
}
test("Docente no edita cabecera", async ({ page }) => {
  await setup(page, "normal", "docente");
  await expect(
    page.getByRole("button", { name: "Modificar datos", exact: true }),
  ).toHaveCount(0);
});

test("historial operativo muestra restablecimiento sin detalles técnicos", async ({
  page,
}) => {
  await setup(page);
  await page.route("**/api/reservas/42", async (route) => {
    await route.fulfill({
      json: {
        id: "42",
        version: 3,
        subject: "Actividad QA",
        course: "001-A-2027",
        courseId: "8",
        teacher: "Laura Gómez",
        teacherId: "D-01",
        students: 20,
        type: "General",
        board: "Tiza",
        resources: [],
        occurrences: [
          {
            id: "11",
            date: "2027-03-15",
            start: "14:00",
            end: "16:00",
            room: "103",
          },
        ],
        changes: [
          {
            at: "2026-09-26T12:00:00Z",
            actor: "Admin Demo",
            description:
              "Restablecimiento demo: se restauró el escenario registrado. Consultá las clases actuales.",
          },
          {
            at: "2026-09-25T12:00:00Z",
            actor: "Admin Demo",
            description:
              "Datos compartidos: tipo General → General; alumnos 20 → 24; recursos {fans} → [air, fans]",
          },
        ],
      },
    });
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Historial de cambios", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Restablecimiento demo:", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Datos compartidos: alumnos 20 → 24; recursos Ventiladores → Aire acondicionado, Ventiladores",
      { exact: false },
    ),
  ).toBeVisible();
  await expect(
    page.getByText("tipo General → General", { exact: false }),
  ).toHaveCount(0);
  mkdirSync("../artifacts/qa/reset", { recursive: true });
  await page.screenshot({
    path: "../artifacts/qa/reset/history-ui.png",
    fullPage: true,
  });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
