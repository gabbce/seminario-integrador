import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { fakeAuth, login } from "./auth-fixture";
import type { Booking } from "../src/domain";
async function setup(
  page: Page,
  mode = "normal",
  role = "bedel",
  periodic = false,
) {
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
  if (periodic) {
    booking.patterns = [{ day: 1, start: "14:00", end: "16:00", room: "103" }];
    booking.schedule = { year: 2027, period: "first", excluded: [] };
    booking.occurrences = booking.occurrences.map((c) => ({
      ...c,
      room: "103",
      originalDate: c.date,
    }));
  }
  type Request = {
    operationId: string;
    version: number;
    dates: { detailId: string; date: string; start: string; modules: number }[];
    calendarVersion?: number;
    roomVersions?: Record<string, number>;
  };
  const control = {
    mode,
    booking,
    requests: [] as Request[],
    result: null as Record<string, unknown> | null,
  };
  function review(body: Request) {
    return {
      reservationId: "42",
      version: body.version,
      calendarVersion: 0,
      roomVersions: { "3": 0 },
      changes: body.dates.map((d) => {
        const original = booking.occurrences.find((c) => c.id === d.detailId)!;
        const [hours, minutes] = d.start.split(":").map(Number);
        const end = hours * 60 + minutes + d.modules * 30;
        return {
          id: d.detailId,
          room: original.room,
          originalDate: original.originalDate ?? original.date,
          before: {
            date: original.date,
            start: original.start,
            end: original.end,
          },
          after: {
            date: d.date,
            start: d.start,
            end: `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`,
          },
        };
      }),
    };
  }
  await page.route("**/api/reservas/42", (r) => r.fulfill({ json: booking }));
  await page.route("**/api/reservas/42/reprogramacion/preparacion", (r) =>
    r.fulfill({ json: review(r.request().postDataJSON()) }),
  );
  await page.route("**/api/reservas/42/reprogramacion/confirmacion", (r) => {
    const body = r.request().postDataJSON() as Request;
    control.requests.push(body);
    if (control.mode === "conflict")
      return r.fulfill({
        status: 409,
        json: {
          code: "CONFLICT",
          message:
            "El aula 103 está ocupada en el nuevo horario. No se guardó ningún cambio.",
        },
      });
    if (control.mode === "lost-before") return r.abort();
    const reviewed = review(body);
    booking.occurrences = booking.occurrences.map((c) => {
      const changed = reviewed.changes.find((d) => d.id === c.id);
      return changed
        ? { ...c, ...changed.after, originalDate: changed.originalDate }
        : c;
    });
    booking.version = 1;
    booking.changes = [
      {
        at: "2026-09-25T12:00:00Z",
        actor: "Bedel QA",
        description: "Reprogramación: 15/03 → 16/03; aula conservada",
      },
    ];
    control.result = {
      ...reviewed,
      version: 1,
      operationId: body.operationId,
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
async function propose(page: Page, multiple = false) {
  await page
    .getByRole("button", { name: "Reprogramar clases", exact: true })
    .click();
  await page.getByRole("checkbox").nth(0).check();
  await page.getByLabel("Nueva fecha", { exact: true }).fill("2027-03-16");
  await page.getByLabel("Nuevo inicio", { exact: true }).fill("15:00");
  await page
    .getByRole("combobox", { name: "Duración", exact: true })
    .selectOption("90");
  if (multiple) {
    await page.getByRole("checkbox").nth(1).check();
    await page
      .getByLabel("Nueva fecha", { exact: true })
      .nth(1)
      .fill("2027-03-23");
  }
  await page.screenshot({
    path: `../artifacts/qa/screens/i044-form-${multiple}-${page.viewportSize()!.width}.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Revisar reprogramación", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Revisar nuevas fechas", exact: true }),
  ).toBeVisible();
}
for (const width of [390, 1440]) {
  for (const periodic of [false, true])
    test(`reprogramar ${periodic ? "periódica múltiple" : "esporádica individual"} ${width}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      const control = await setup(page, "normal", "bedel", periodic);
      await propose(page, periodic);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.screenshot({
        path: `../artifacts/qa/screens/i044-review-${periodic}-${width}.png`,
        fullPage: true,
      });
      await page
        .getByRole("button", { name: "Guardar reprogramación", exact: true })
        .focus();
      await page.keyboard.press("Enter");
      await expect(
        page.getByRole("heading", { name: "Reprogramación confirmada" }),
      ).toBeVisible();
      expect(control.requests[0].dates).toHaveLength(periodic ? 2 : 1);
      expect(control.requests[0].dates[0]).toEqual({
        detailId: "11",
        date: "2027-03-16",
        start: "15:00",
        modules: 3,
      });
      expect(control.requests[0]).toMatchObject({
        calendarVersion: 0,
        roomVersions: { "3": 0 },
      });
      await page.screenshot({
        path: `../artifacts/qa/screens/i044-success-${periodic}-${width}.png`,
        fullPage: true,
      });
      await page
        .getByRole("button", { name: "Ver detalle actualizado" })
        .click();
      await page.reload();
      await expect(
        page.getByText("Fecha original: 15 de marzo de 2027", { exact: true }),
      ).toBeVisible();
      await page.screenshot({
        path: `../artifacts/qa/screens/i044-history-${periodic}-${width}.png`,
        fullPage: true,
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(errors).toEqual([]);
    });
  test(`reprogramar conflicto conserva fechas ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await setup(page, "conflict");
    await propose(page);
    await page
      .getByRole("button", { name: "Guardar reprogramación", exact: true })
      .click();
    await expect(
      page.getByText("El aula 103 está ocupada", { exact: false }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Corregir fechas", exact: true })
      .click();
    await expect(page.getByLabel("Nueva fecha", { exact: true })).toHaveValue(
      "2027-03-16",
    );
    await page.screenshot({
      path: `../artifacts/qa/screens/i044-conflict-${width}.png`,
      fullPage: true,
    });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
  for (const mode of ["lost-before", "lost-after"])
    test(`reprogramar ${mode} recarga conserva UUID ${width}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      const control = await setup(page, mode);
      await propose(page);
      await page
        .getByRole("button", { name: "Guardar reprogramación", exact: true })
        .click();
      await expect(
        page.getByText("No se pudo comprobar el resultado", { exact: false }),
      ).toBeVisible();
      const original = control.requests[0];
      await page.reload();
      await expect(
        page.getByRole("heading", { name: "Comprobar reprogramación" }),
      ).toBeVisible();
      await page.screenshot({
        path: `../artifacts/qa/screens/i044-${mode}-${width}.png`,
        fullPage: true,
      });
      await page
        .getByRole("button", { name: "Consultar resultado", exact: true })
        .click();
      if (mode === "lost-before") {
        await expect(
          page.getByText("Todavía no hay resultado confirmado", {
            exact: false,
          }),
        ).toBeVisible();
        control.mode = "normal";
        await page
          .getByRole("button", {
            name: "Reintentar misma reprogramación",
            exact: true,
          })
          .click();
        expect(control.requests[1]).toEqual(original);
      }
      await expect(
        page.getByRole("heading", { name: "Reprogramación confirmada" }),
      ).toBeVisible();
    });
}
test("Docente no reprograma", async ({ page }) => {
  await setup(page, "normal", "docente");
  await expect(
    page.getByRole("button", { name: "Reprogramar clases", exact: true }),
  ).toHaveCount(0);
});

test("reprogramar recupera IDs aunque otra edición reordene clases", async ({
  page,
}) => {
  const control = await setup(page, "lost-before");
  await propose(page);
  await page
    .getByRole("button", { name: "Guardar reprogramación", exact: true })
    .click();
  await expect(
    page.getByText("No se pudo comprobar el resultado", { exact: false }),
  ).toBeVisible();
  control.booking.occurrences[0].date = "2027-03-24";
  control.booking.occurrences.reverse();
  control.booking.version = 1;
  control.mode = "conflict";
  await page.reload();
  await page
    .getByRole("button", {
      name: "Reintentar misma reprogramación",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("El aula 103 está ocupada", { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole("checkbox").nth(1)).toBeChecked();
  await expect(page.getByRole("checkbox").nth(0)).not.toBeChecked();
  await expect(page.getByLabel("Nueva fecha", { exact: true })).toHaveValue(
    "2027-03-16",
  );
  control.mode = "normal";
  await page
    .getByRole("button", { name: "Revisar reprogramación", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Guardar reprogramación", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Reprogramación confirmada" }),
  ).toBeVisible();
  expect(control.requests[2]).toMatchObject({
    version: 1,
    dates: [{ detailId: "11", date: "2027-03-16", start: "15:00", modules: 3 }],
  });
});
