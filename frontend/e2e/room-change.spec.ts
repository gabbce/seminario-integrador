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
    booking.occurrences[1] = {
      ...booking.occurrences[1],
      date: "2027-03-23",
      originalDate: "2027-03-22",
      room: "103",
    };
  }
  if (mode === "swap")
    booking.occurrences[1].date = booking.occurrences[0].date;
  const rooms = [
    { internalId: "5", id: "202", capacity: 40, version: 0 },
    { internalId: "6", id: "203", capacity: 50, version: 1 },
  ];
  if (mode === "swap") {
    rooms[0].id = "105";
    rooms[1].id = "103";
  }
  const groups = periodic
    ? [
        {
          groupId: "p:1",
          label: "Lunes 14:00:00 · patrón completo",
          detailIds: ["11", "12"],
          classes: booking.occurrences,
          availableRooms: rooms,
        },
      ]
    : booking.occurrences.map((c) => ({
        groupId: `d:${c.id}`,
        label: `${c.date} ${c.start}:00`,
        detailIds: [c.id!],
        classes: [c],
        availableRooms: rooms,
      }));
  type Selection = {
    groupId: string;
    detailIds: string[];
    roomId: string;
    roomVersion: number;
  };
  type Request = {
    operationId: string;
    version: number;
    selections: Selection[];
  };
  const control = {
    mode,
    requests: [] as Request[],
    result: null as Record<string, unknown> | null,
  };
  await page.route("**/api/reservas/42", (r) => r.fulfill({ json: booking }));
  await page.route("**/api/reservas/42/aulas/opciones", (r) => {
    const selected = r.request().postDataJSON().selectedGroupIds ?? [];
    return r.fulfill({
      json: {
        reservationId: "42",
        version: 0,
        periodic,
        groups:
          mode === "swap"
            ? groups.map((g) => ({
                ...g,
                availableRooms:
                  selected.length === 2
                    ? rooms.filter((room) => room.id !== g.classes[0].room)
                    : [],
              }))
            : groups,
      },
    });
  });
  function reviewed(body: Request) {
    return {
      reservationId: "42",
      version: body.version,
      changes: body.selections.flatMap((s) =>
        groups
          .find((g) => g.groupId === s.groupId)!
          .classes.map((c) => ({
            ...c,
            groupId: s.groupId,
            newRoom: rooms.find((r) => r.internalId === s.roomId)!.id,
          })),
      ),
    };
  }
  await page.route("**/api/reservas/42/aulas/preparacion", (r) =>
    r.fulfill({ json: reviewed(r.request().postDataJSON()) }),
  );
  await page.route("**/api/reservas/42/aulas/confirmacion", (r) => {
    const body = r.request().postDataJSON() as Request;
    control.requests.push(body);
    if (control.mode === "conflict")
      return r.fulfill({
        status: 409,
        json: {
          code: "CONFLICT",
          message:
            "El aula 202 está ocupada el 2027-03-15. No se guardó ningún cambio.",
        },
      });
    if (control.mode === "lost-before") return r.abort();
    const review = reviewed(body);
    booking.occurrences = booking.occurrences.map((c) => ({
      ...c,
      room: review.changes.find((v) => v.id === c.id)?.newRoom ?? c.room,
    }));
    if (booking.patterns) booking.patterns[0].room = review.changes[0].newRoom;
    booking.version = 1;
    booking.changes = [
      {
        at: "2026-09-25T12:00:00Z",
        actor: "Bedel QA",
        description: "Cambio de aulas: 103 → 202",
      },
    ];
    control.result = {
      ...review,
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
async function select(page: Page) {
  await page.getByRole("button", { name: "Cambiar aula", exact: true }).click();
  const boxes = page.getByRole("checkbox");
  await expect(boxes.first()).toBeVisible();
  await expect(boxes.first()).toHaveAccessibleName(
    /^(Lunes 14:00 · patrón completo|15 de marzo de 2027 14:00)$/,
  );
  for (let i = 0; i < (await boxes.count()); i++) {
    await boxes.nth(i).check();
    await page.getByRole("combobox").nth(i).selectOption("5");
  }
  await page
    .getByRole("button", { name: "Revisar cambio de aulas", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Revisar cambio de aulas", exact: true }),
  ).toBeVisible();
}
for (const width of [390, 1440]) {
  for (const periodic of [false, true])
    test(`aulas ${periodic ? "patrón" : "fechas"} revisión teclado ${width}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      const control = await setup(page, "normal", "bedel", periodic);
      await select(page);
      await expect(
        page.getByRole("heading", { name: "2 clases afectadas" }),
      ).toBeVisible();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.screenshot({
        path: `../artifacts/qa/screens/i043b-review-${periodic}-${width}.png`,
        fullPage: true,
      });
      await page
        .getByRole("button", { name: "Confirmar cambio de aulas", exact: true })
        .focus();
      await page.keyboard.press("Enter");
      await expect(
        page.getByRole("heading", { name: "Cambio de aulas confirmado" }),
      ).toBeVisible();
      expect(control.requests[0].selections).toHaveLength(periodic ? 1 : 2);
      expect(
        control.requests[0].selections.flatMap((s) => s.detailIds),
      ).toEqual(["11", "12"]);
      await page.screenshot({
        path: `../artifacts/qa/screens/i043b-success-${periodic}-${width}.png`,
        fullPage: true,
      });
      await page
        .getByRole("button", { name: "Ver detalle actualizado" })
        .click();
      await page.reload();
      await expect(
        page.getByText("Cambio de aulas: 103 → 202", { exact: false }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(errors).toEqual([]);
    });
  test(`aulas conflicto conserva selección ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await setup(page, "conflict");
    await select(page);
    await page
      .getByRole("button", { name: "Confirmar cambio de aulas", exact: true })
      .click();
    await expect(
      page.getByText("El aula 202 está ocupada", { exact: false }),
    ).toBeVisible();
    await expect(page.getByRole("combobox").first()).toHaveValue("5");
    await expect(page.getByRole("checkbox").first()).toBeChecked();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: `../artifacts/qa/screens/i043b-conflict-${width}.png`,
      fullPage: true,
    });
  });
  for (const mode of ["lost-before", "lost-after"])
    test(`aulas ${mode} misma operación tras recarga ${width}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      const control = await setup(page, mode);
      await select(page);
      await page
        .getByRole("button", { name: "Confirmar cambio de aulas", exact: true })
        .click();
      await expect(
        page.getByText("No se pudo comprobar el resultado", { exact: false }),
      ).toBeVisible();
      const original = control.requests[0];
      await page.reload();
      await expect(
        page.getByRole("heading", { name: "Comprobar cambio de aulas" }),
      ).toBeVisible();
      await page.screenshot({
        path: `../artifacts/qa/screens/i043b-${mode}-${width}.png`,
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
          .getByRole("button", { name: "Reintentar mismo cambio", exact: true })
          .click();
        expect(control.requests[1]).toEqual(original);
      }
      await expect(
        page.getByRole("heading", { name: "Cambio de aulas confirmado" }),
      ).toBeVisible();
    });
}
test("aulas Docente no tiene acciones de cambio", async ({ page }) => {
  await setup(page, "normal", "docente");
  await expect(
    page.getByRole("button", { name: "Cambiar aula", exact: true }),
  ).toHaveCount(0);
});

test("aulas intercambio recalcula opciones del conjunto seleccionado", async ({
  page,
}) => {
  const control = await setup(page, "swap");
  await page.getByRole("button", { name: "Cambiar aula", exact: true }).click();
  await expect(page.getByRole("checkbox").first()).toBeVisible();
  await expect(page.getByRole("checkbox").first()).toBeEnabled();
  await page.getByRole("checkbox").nth(0).check();
  await page.getByRole("checkbox").nth(1).check();
  await page.getByRole("combobox").nth(0).selectOption("5");
  await page.getByRole("combobox").nth(1).selectOption("6");
  await page
    .getByRole("button", { name: "Revisar cambio de aulas", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "2 clases afectadas" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Confirmar cambio de aulas", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Cambio de aulas confirmado" }),
  ).toBeVisible();
  expect(control.requests[0].selections.map((s) => s.roomId)).toEqual([
    "5",
    "6",
  ]);
});
