import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { fakeAuth, login } from "./auth-fixture";

async function setup(page: Page, role = "bedel") {
  await fakeAuth(page);
  const rooms = [1, 2, 3, 4].map((id) => ({
    internalId: String(id),
    id: `ESP-${id}`,
    version: 0,
    type: "Multimedios",
    capacity: 30 + id,
    state: "Habilitada",
    location: "QA",
    floor: 0,
    board: "Tiza",
    resources: [],
    history: [],
  }));
  await page.route("**/api/referencias/aulas", (r) =>
    r.fulfill({ json: rooms }),
  );
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
          code: 8,
          subject: "Actividad QA",
          commission: "A",
          year: 2027,
        },
      ],
    }),
  );
  await page.route("**/api/referencias/docentes", (r) =>
    r.fulfill({ json: [{ id: "D-01", name: "Docente QA" }] }),
  );
  const control = {
    mode: "normal",
    occupied: false,
    requests: [] as {
      operationId: string;
      proposal: { dates: { date: string; start: string; modules: number }[] };
      selections: { date: string; roomId: string }[];
    }[],
    booking: null as Record<string, unknown> | null,
  };
  await page.route("**/api/reservas/esporadicas/preparacion", (r) => {
    const body = r.request().postDataJSON();
    if (!body.dates.length || body.dates.some((d: { date: string }) => !d.date))
      return r.fulfill({
        status: 400,
        json: { code: "INVALID", message: "Indicá fechas válidas." },
      });
    return r.fulfill({
      json: {
        year: 2027,
        calendarVersion: 0,
        dates: [...body.dates]
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((d: { date: string; start: string; modules: number }) => ({
            ...d,
            end: "16:00",
            availableRooms: control.occupied ? [] : rooms,
            compatibleCount: 4,
            alternatives: control.occupied
              ? rooms.map((room) => ({
                  room,
                  group: "WITH_PERIODIC",
                  periodicMinutes: 30,
                  sporadicMinutes: 30,
                  sporadicDates: 1,
                  conflicts: [
                    {
                      reservationId: "44",
                      subject: "Conflicto QA",
                      course: "001-A-2027",
                      modality: "periodic",
                      date: d.date,
                      start: "14:00",
                      end: "15:00",
                      overlapStart: "14:00",
                      overlapEnd: "15:00",
                      overlapMinutes: 60,
                      teacher: "Solicitante QA",
                      ...(role === "docente"
                        ? {}
                        : {
                            teacherEmail: "qa@example.test",
                            registrant: {
                              name: "Bedel QA",
                              email: "bedel@example.test",
                              inactive: false,
                            },
                          }),
                    },
                  ],
                }))
              : [],
          })),
      },
    });
  });
  await page.route("**/api/reservas/esporadicas/confirmacion", (r) => {
    const body = r.request().postDataJSON();
    control.requests.push(body);
    if (control.mode === "conflict")
      return r.fulfill({
        status: 409,
        json: {
          code: "CONFLICT",
          message: "El aula del 2027-07-12 ya no está disponible.",
        },
      });
    if (control.mode === "lost-before" && control.requests.length === 1)
      return r.abort();
    control.booking = {
      id: "990",
      version: 0,
      subject: "Actividad QA",
      course: "008-A-2027",
      courseId: "8",
      teacher: "Docente QA",
      teacherId: "D-01",
      students: 30,
      type: "Multimedios",
      board: "",
      resources: [],
      occurrences: body.proposal.dates.map(
        (d: { date: string; start: string }, i: number) => ({
          id: String(i + 1),
          date: d.date,
          start: d.start,
          end: "16:00",
          room: `ESP-${body.selections.find((s: { date: string }) => s.date === d.date).roomId}`,
          cancelled: false,
        }),
      ),
    };
    if (control.mode === "lost") return r.abort();
    return r.fulfill({ json: control.booking });
  });
  await page.route("**/api/reservas/operaciones/*", (r) =>
    r.fulfill({
      json: {
        found: !!control.booking,
        ...(control.booking ? { booking: control.booking } : {}),
      },
    }),
  );
  await page.route("**/api/reservas/990", (r) =>
    r.fulfill({ json: control.booking }),
  );
  await page.route("**/api/reservas", (r) =>
    r.fulfill({ json: control.booking ? [control.booking] : [] }),
  );
  await page.goto("/");
  await login(page, role);
  return control;
}
async function prepare(page: Page, queryOnly = false) {
  await page.goto(queryOnly ? "/disponibilidad" : "/reservas/nueva");
  await page.getByLabel("Modalidad", { exact: true }).selectOption("sporadic");
  await page.getByLabel("Fecha", { exact: true }).fill("2027-07-12");
  await page
    .getByRole("button", { name: "Agregar fecha", exact: true })
    .click();
  await page.getByLabel("Fecha", { exact: true }).nth(1).fill("2027-07-14");
  await page.getByRole("button", { name: "Buscar aulas" }).click();
}
async function review(page: Page) {
  await page
    .getByRole("radio", { name: /Aula ESP-1/ })
    .first()
    .check();
  await page
    .getByRole("radio", { name: /Aula ESP-2/ })
    .nth(1)
    .check();
  await page.getByRole("button", { name: "Revisar reserva" }).click();
}
for (const width of [390, 1440])
  test(`esporádica varias aulas, revisión y recarga ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const control = await setup(page);
    await prepare(page);
    await page.screenshot({
      path: `/tmp/i041-seleccion-${width}.png`,
      fullPage: true,
    });
    await review(page);
    await page.screenshot({
      path: `/tmp/i041-revision-${width}.png`,
      fullPage: true,
    });
    const confirm = page.getByRole("button", {
      name: "Confirmar reserva",
      exact: true,
    });
    await confirm.focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("heading", { name: "Reserva confirmada" }),
    ).toBeVisible();
    expect(control.requests).toHaveLength(1);
    expect(control.requests[0].selections.map((s) => s.roomId)).toEqual([
      "1",
      "2",
    ]);
    await page.screenshot({
      path: `/tmp/i041-exito-${width}.png`,
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Ver detalle", exact: true })
      .click();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Actividad QA", exact: true }),
    ).toBeVisible();
    expect(
      (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
        .violations,
    ).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
  });
for (const width of [390, 1440])
  for (const mode of ["conflict", "lost", "lost-before"])
    test(`esporádica ${mode} conserva propuesta e identidad ${width}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      const control = await setup(page);
      await prepare(page);
      await review(page);
      control.mode = mode;
      await page
        .getByRole("button", { name: "Confirmar reserva", exact: true })
        .click();
      if (mode === "conflict") {
        await expect(
          page.getByText("El aula del 2027-07-12 ya no está disponible."),
        ).toBeVisible();
        await page.screenshot({
          path: `/tmp/i041-conflicto-${width}.png`,
          fullPage: true,
        });
        expect(control.booking).toBeNull();
        await page.getByRole("button", { name: "Volver", exact: true }).click();
        await expect(
          page.getByLabel("Fecha", { exact: true }).first(),
        ).toHaveValue("2027-07-12");
      } else {
        await expect(
          page.getByRole("heading", {
            name: "No pudimos confirmar el resultado",
          }),
        ).toBeVisible();
        await page.screenshot({
          path: `/tmp/i041-${mode}-${width}.png`,
          fullPage: true,
        });
        await page
          .getByRole("button", { name: "Comprobar estado de la reserva" })
          .click();
        if (mode === "lost-before") {
          await expect(
            page.getByText(/todavía no figura confirmada/),
          ).toBeVisible();
          await page
            .getByRole("button", { name: "Reintentar la misma operación" })
            .click();
          expect(control.requests[1]).toEqual(control.requests[0]);
        }
        await expect(
          page.getByRole("heading", { name: "Reserva confirmada" }),
        ).toBeVisible();
      }
    });
test("esporádica Docente solo consulta alternativas informativas", async ({
  page,
}) => {
  const control = await setup(page, "docente");
  control.occupied = true;
  await prepare(page, true);
  await expect(
    page.getByText("60 minutos de interferencia").first(),
  ).toBeVisible();
  await page
    .getByText("Ver conflictos del aula ESP-1", { exact: true })
    .first()
    .click();
  await expect(page.getByText(/Contacto docente:|Registró:/)).toHaveCount(0);
  await expect(page.getByRole("radio")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Preparar reserva" }),
  ).toHaveCount(0);
  await page.screenshot({ path: "/tmp/i041-docente.png", fullPage: true });
});

test("esporádica exclusión explícita y validación de conjunto vacío", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  await setup(page);
  await prepare(page);
  await page.getByRole("button", { name: "Volver", exact: true }).click();
  await page
    .getByRole("button", { name: "Quitar fecha 2", exact: true })
    .click();
  await page.getByRole("button", { name: "Buscar aulas" }).click();
  await page
    .getByRole("radio", { name: /Aula ESP-1/ })
    .first()
    .check();
  await page.getByRole("button", { name: "Revisar reserva" }).click();
  await page.getByText("Ver fechas excluidas (1)", { exact: true }).click();
  await expect(
    page.getByText(/14 de julio de 2027.*Exclusión manual/),
  ).toBeVisible();
  await page.screenshot({
    path: "/tmp/i041-exclusion-390.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Volver", exact: true }).click();
  await page.getByRole("button", { name: "Volver", exact: true }).click();
  await page
    .getByRole("button", { name: "Quitar fecha 1", exact: true })
    .click();
  await expect(page.getByText("Indicá fechas válidas.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Buscar aulas" }),
  ).toBeDisabled();
  await page.screenshot({
    path: "/tmp/i041-validacion-390.png",
    fullPage: true,
  });
});

test("esporádica conserva aulas por fecha con respuesta ordenada diferente al ingreso", async ({
  page,
}) => {
  const control = await setup(page);
  await prepare(page);
  await page.getByRole("button", { name: "Volver", exact: true }).click();
  await page.getByLabel("Fecha", { exact: true }).first().fill("2027-07-16");
  await page.getByRole("button", { name: "Buscar aulas" }).click();
  await page.locator('input[name="room-1"]').first().check();
  await page.locator('input[name="room-2"]').nth(1).check();
  await page.getByRole("button", { name: "Revisar reserva" }).click();
  await page
    .getByRole("button", { name: "Confirmar reserva", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Reserva confirmada" }),
  ).toBeVisible();
  expect(control.requests[0].selections).toEqual([
    { date: "2027-07-14", roomId: "2", roomVersion: 0 },
    { date: "2027-07-16", roomId: "1", roomVersion: 0 },
  ]);
});
