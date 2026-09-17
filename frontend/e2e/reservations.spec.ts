import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { fakeAuth, login } from "./auth-fixture";
import type { Booking } from "../src/domain";

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
    availability: "available" as "available" | "occupied" | "incompatible",
    calls: 0,
    confirmations: 0,
    confirmationMode: "normal" as
      "normal" | "conflict" | "lost" | "lost-before",
    bookings: [] as Booking[],
    operationId: "",
    operationIds: [] as string[],
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
          availableRooms:
            pattern.day === 1 && control.availability !== "available"
              ? []
              : inventory,
          compatibleCount:
            pattern.day === 1 && control.availability === "incompatible"
              ? 0
              : 4,
          alternatives:
            pattern.day === 1 && control.availability === "occupied"
              ? inventory.map((room, index) => ({
                  room,
                  group: index < 2 ? "SPORADIC_ONLY" : "WITH_PERIODIC",
                  sporadicDates: index < 2 ? 1 : 0,
                  sporadicMinutes: index < 2 ? (index + 1) * 30 : 0,
                  periodicMinutes: index >= 2 ? (index - 1) * 30 : 0,
                  conflicts: [
                    {
                      reservationId: String(700 + index),
                      subject: "Física QA",
                      course: "002-B-2027",
                      modality: index < 2 ? "sporadic" : "periodic",
                      date,
                      start: "14:00",
                      end: index % 2 === 0 ? "14:30" : "15:00",
                      overlapStart: "14:00",
                      overlapEnd: index % 2 === 0 ? "14:30" : "15:00",
                      overlapMinutes: index % 2 === 0 ? 30 : 60,
                      teacher: "Docente de Física",
                      ...(role !== "docente"
                        ? {
                            teacherEmail: "fisica@example.test",
                            registrant: {
                              userId: "11",
                              name: "Operador Actual",
                              email: "actual@example.test",
                              inactive: true,
                            },
                          }
                        : {}),
                    },
                  ],
                }))
              : [],
        };
      },
    );
    return r.fulfill({ json: { year: 2027, calendarVersion: 4, patterns } });
  });
  await page.route("**/api/reservas", (r) =>
    r.fulfill({ json: control.bookings }),
  );
  await page.route(/\/api\/reservas\/\d+$/, (r) => {
    const booking = control.bookings.find((b) =>
      r.request().url().endsWith(`/${b.id}`),
    );
    return booking
      ? r.fulfill({ json: booking })
      : r.fulfill({
          status: 404,
          json: { code: "NOT_FOUND", message: "Reserva no encontrada." },
        });
  });
  await page.route("**/api/reservas/operaciones/*", (r) =>
    r.fulfill({
      json: {
        found: control.bookings.length > 0,
        booking: control.bookings[0],
      },
    }),
  );
  await page.route("**/api/reservas/periodicas/confirmacion", async (r) => {
    control.confirmations++;
    const body = r.request().postDataJSON();
    control.operationId = body.operationId;
    control.operationIds.push(body.operationId);
    if (control.confirmationMode === "lost-before")
      return r.abort("connectionfailed");
    if (control.confirmationMode === "conflict")
      return r.fulfill({
        status: 409,
        json: {
          code: "CONFLICT",
          message: "El aula se ocupó para el 15/03/2027. Volvé a consultar.",
        },
      });
    const proposal = body.proposal;
    const patterns = proposal.patterns.map(
      (p: { day: number; start: string; modules: number }) => {
        const selected = body.selections.find(
          (s: { day: number }) => s.day === p.day,
        );
        const end =
          Number(p.start.slice(0, 2)) * 60 +
          Number(p.start.slice(3)) +
          p.modules * 30;
        return {
          day: p.day,
          start: p.start,
          end: `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`,
          room: inventory.find((room) => room.internalId === selected.roomId)!
            .id,
        };
      },
    );
    const booking: Booking = {
      id: "901",
      version: 0,
      subject: "Matemática QA",
      course: "001-A-2027",
      courseId: "80",
      teacher: "Docente QA",
      teacherId: "D-01",
      students: proposal.students,
      type: proposal.type,
      resources: proposal.resources,
      board: proposal.board,
      schedule: {
        year: proposal.year,
        period: proposal.period,
        excluded: proposal.excluded,
      },
      patterns,
      occurrences: patterns.flatMap(
        (p: { day: number; start: string; end: string; room: string }) =>
          body.selections
            .find((s: { day: number }) => s.day === p.day)
            .dates.map((date: string) => ({
              date,
              originalDate: date,
              start: p.start,
              end: p.end,
              room: p.room,
            })),
      ),
      ...(role !== "docente"
        ? {
            teacherEmail: "qa@example.test",
            registrant: {
              name: "Bedel Demo",
              email: "bedel@demo.local",
              userId: "2",
            },
          }
        : {}),
    };
    control.bookings = [booking];
    if (control.confirmationMode === "lost") return r.abort("connectionfailed");
    return r.fulfill({ status: 201, json: booking });
  });
  await page.goto("/");
  await login(page, role);
  return control;
}

for (const width of [390, 1440])
  test(`preparación periódica usa respuesta API a ${width}px`, async ({
    page,
  }) => {
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

async function prepareFirst(page: Page) {
  await page.goto("/reservas/nueva");
  await page.getByLabel("Período", { exact: true }).selectOption("first");
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
}
for (const width of [390, 1440])
  test(`confirmación y detalle persistido a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const control = await setup(page);
    await prepareFirst(page);
    await page
      .getByRole("button", { name: "Confirmar reserva", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Reserva confirmada" }),
    ).toBeVisible();
    expect(control.confirmations).toBe(1);
    expect(control.operationId).toMatch(/^[0-9a-f-]{36}$/);
    await page.screenshot({
      path: `/tmp/i032-exito-${width}.png`,
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Ver detalle", exact: true })
      .click();
    await expect(page).toHaveURL(/\/reservas\/901$/);
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Matemática QA", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: /Cancelar clases|Reprogramar|Cambiar aula|Editar datos/,
      }),
    ).toHaveCount(0);
    await page.screenshot({
      path: `/tmp/i032-detalle-${width}.png`,
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

test("conflicto al confirmar conserva la propuesta", async ({ page }) => {
  const control = await setup(page);
  await prepareFirst(page);
  control.confirmationMode = "conflict";
  await page
    .getByRole("button", { name: "Confirmar reserva", exact: true })
    .click();
  await expect(
    page.getByText("El aula se ocupó para el 15/03/2027. Volvé a consultar."),
  ).toBeVisible();
  expect(control.bookings).toHaveLength(0);
  await expect(
    page.getByRole("heading", { name: "Reserva confirmada" }),
  ).toHaveCount(0);
  await expect(page.locator('input[name="room-1"]').first()).toBeVisible();
  await page.screenshot({ path: "/tmp/i032-conflicto.png", fullPage: true });
});

test("respuesta perdida recupera la operación sin otro alta", async ({
  page,
}) => {
  const control = await setup(page);
  await prepareFirst(page);
  control.confirmationMode = "lost";
  await page
    .getByRole("button", { name: "Confirmar reserva", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "No pudimos confirmar el resultado" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Comprobar estado/ }).click();
  await expect(
    page.getByRole("heading", { name: "Reserva confirmada" }),
  ).toBeVisible();
  expect(control.confirmations).toBe(1);
  expect(control.bookings).toHaveLength(1);
});

test("resultado aún no encontrado reintenta con la misma identidad", async ({
  page,
}) => {
  const control = await setup(page);
  await prepareFirst(page);
  control.confirmationMode = "lost-before";
  await page
    .getByRole("button", { name: "Confirmar reserva", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "No pudimos confirmar el resultado" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Comprobar estado/ }).click();
  control.confirmationMode = "normal";
  await page.getByRole("button", { name: /Reintentar/ }).click();
  await expect(
    page.getByRole("heading", { name: "Reserva confirmada" }),
  ).toBeVisible();
  expect(control.confirmations).toBe(2);
  expect(new Set(control.operationIds).size).toBe(1);
});

test("listado previo demorado no borra una confirmación nueva de la agenda", async ({
  page,
}) => {
  await setup(page);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/reservas", async (route) => {
    await gate;
    await route.fulfill({ json: [] });
  });
  try {
    await prepareFirst(page);
    await page
      .getByRole("button", { name: "Confirmar reserva", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Reserva confirmada" }),
    ).toBeVisible();
    release();
    await page
      .getByRole("button", { name: "Ver en la agenda", exact: true })
      .click();
    await expect(page.getByLabel("Fecha de agenda")).toHaveValue("2027-03-15");
    await expect(
      page.getByText("Matemática QA", { exact: true }).first(),
    ).toBeVisible();
  } finally {
    release();
  }
});

for (const width of [390, 1440])
  test(`alternativas informativas y nueva consulta a ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const control = await setup(page);
    control.availability = "occupied";
    await page.goto("/reservas/nueva");
    await page.getByLabel("Período", { exact: true }).selectOption("first");
    await page.getByRole("button", { name: "Buscar aulas" }).click();
    await expect(
      page.getByRole("heading", { name: "Requieren resolver conflictos" }),
    ).toBeVisible();
    await expect(page.locator('input[name="room-1"]')).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Revisar reserva" }),
    ).toBeDisabled();
    await expect(
      page.getByText("Ver conflictos del aula QA-4", { exact: true }),
    ).toHaveCount(0);
    await page
      .getByText("Ver conflictos del aula QA-1", { exact: true })
      .click();
    await expect(
      page.getByText("fisica@example.test", { exact: false }).first(),
    ).toBeVisible();
    await expect(
      page.getByText("actual@example.test", { exact: false }).first(),
    ).toBeVisible();
    await expect(page.getByText(/inactiv/i).first()).toBeVisible();
    const refreshBounds = await page
      .getByRole("button", { name: "Volver a consultar", exact: true })
      .boundingBox();
    expect(refreshBounds).not.toBeNull();
    expect(refreshBounds!.x).toBeGreaterThanOrEqual(0);
    expect(refreshBounds!.x + refreshBounds!.width).toBeLessThanOrEqual(width);
    await page.screenshot({
      path: `/tmp/i033-alternativas-${width}.png`,
      fullPage: true,
    });
    await page
      .locator(".form-actions")
      .screenshot({ path: `/tmp/i033-acciones-${width}.png` });
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
    await page
      .getByRole("button", {
        name: "Ver todas las alternativas (4)",
        exact: true,
      })
      .click();
    await expect(
      page.getByText("Ver conflictos del aula QA-4", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Volver a consultar", exact: true })
      .first()
      .click();
    await expect(
      page.getByRole("heading", { name: "Requieren resolver conflictos" }),
    ).toBeVisible();
    await expect(page.locator('input[name="room-1"]')).toHaveCount(0);
    control.availability = "available";
    await page
      .getByRole("button", { name: "Volver a consultar", exact: true })
      .first()
      .click();
    await expect(
      page.getByRole("heading", { name: "Requieren resolver conflictos" }),
    ).toHaveCount(0);
    await expect(page.locator('input[name="room-1"]')).toHaveCount(3);
    await expect(
      page.getByText("Matemática QA", { exact: true }),
    ).toBeVisible();
  });

test("alternativas Docente no muestran contactos ni acciones de selección", async ({
  page,
}) => {
  const control = await setup(page, "docente");
  control.availability = "occupied";
  await page.goto("/disponibilidad");
  await page.getByLabel("Período", { exact: true }).selectOption("first");
  await page.getByRole("button", { name: "Buscar aulas" }).click();
  await page.getByText("Ver conflictos del aula QA-1", { exact: true }).click();
  await expect(
    page.getByText("002-B-2027", { exact: false }).first(),
  ).toBeVisible();
  await expect(
    page.getByText(/fisica@example|actual@example|Operador Actual/),
  ).toHaveCount(0);
  await expect(page.getByRole("radio")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Confirmar reserva" }),
  ).toHaveCount(0);
  await page.screenshot({ path: "/tmp/i033-docente.png", fullPage: true });
});

test("sin aulas compatibles no ofrece alternativas insuficientes", async ({
  page,
}) => {
  const control = await setup(page);
  control.availability = "incompatible";
  await page.goto("/reservas/nueva");
  await page.getByRole("button", { name: "Buscar aulas" }).click();
  await expect(
    page.getByText(
      "No hay aulas compatibles con la capacidad, el tipo y los recursos solicitados.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Requieren resolver conflictos" }),
  ).toHaveCount(0);
  await expect(page.locator('input[name="room-1"]')).toHaveCount(0);
});
