import { test, expect } from "@playwright/test";
import { fakeAuth, login } from "./auth-fixture";

test("login mantiene ruta profunda, contexto de clase, patrón y cese", async ({
  page,
}) => {
  await fakeAuth(page);
  await page.route("**/api/reservas/44", (route) =>
    route.fulfill({
      json: {
        id: "44",
        subject: "Serie QA",
        course: "001-A-2027",
        teacher: "Docente QA",
        students: 20,
        patterns: [{ day: 1, start: "14:00", end: "15:00", room: "101" }],
        schedule: { year: 2027, period: "first", excluded: ["2027-03-08"] },
        continuityCancelledAt: "2027-03-02T12:00:00",
        occurrences: [
          {
            id: "0",
            date: "2027-03-01",
            start: "13:00",
            end: "14:00",
            room: "102",
            cancelled: true,
          },
          {
            id: "1",
            date: "2027-03-01",
            start: "14:00",
            end: "15:00",
            room: "101",
            cancelled: true,
          },
        ],
      },
    }),
  );
  const target = "/reservas/44?fecha=2027-03-01&hora=14:00";
  await page.goto(target);
  await login(page, "docente");
  await expect(page).toHaveURL(target);
  await expect(page.getByRole("heading", { name: "Serie QA" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Patrón semanal" }),
  ).toBeVisible();
  await expect(page.getByText(/Cese de continuidad/)).toBeVisible();
  await expect(page.getByText(/Exclusiones manuales:/)).toContainText(
    "8 de marzo",
  );
  await expect(
    page.getByRole("region", { name: "Clase consultada" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Clase consultada" }),
  ).toContainText("14:00–15:00 · Aula 101");
  await expect(page.locator("#clase-consultada")).toContainText("14:00–15:00");
  await page.route("**/api/consultas/listado?*", (route) =>
    route.fulfill({
      json: {
        total: 1,
        page: 0,
        size: 20,
        filters: {},
        rows: [
          {
            id: "1",
            bookingId: "44",
            subject: "Clase de las 14",
            course: "001-A-2027",
            teacher: "QA",
            students: 20,
            date: "2027-03-01",
            start: "14:00",
            end: "15:00",
            room: "101",
            type: "General",
            cancelled: true,
          },
        ],
      },
    }),
  );
  await page.goto("/reservas?date=2027-03-01&status=cancelled");
  await page.getByRole("button", { name: "Clase de las 14" }).click();
  await expect(
    page.getByRole("region", { name: "Clase consultada" }),
  ).toContainText("14:00–15:00 · Aula 101");
  await expect(page.locator("#clase-consultada")).toContainText("14:00–15:00");
  await page.getByRole("button", { name: "Reservas", exact: true }).click();
  await expect(page).toHaveURL(/date=2027-03-01&status=cancelled/);
});

test("URL imposible y páginas inválidas no rompen la consulta", async ({
  page,
}) => {
  await fakeAuth(page);
  await page.route("**/api/reservas/44", (route) =>
    route.fulfill({
      status: 404,
      json: { message: "Reserva no incluida en esta prueba de filtros" },
    }),
  );
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/agenda?fecha=2027-13-45");
  await login(page);
  await expect(page.getByRole("alert")).toContainText(
    "fecha de agenda no es válida",
  );
  await expect(page.getByLabel("Fecha de agenda")).toBeVisible();
  await page.goto("/agenda?fecha=2027-02-30");
  await expect(page.getByRole("alert")).toContainText(
    "fecha de agenda no es válida",
  );
  await page.route("**/api/consultas/listado?*", async (route) => {
    const params = new URL(route.request().url()).searchParams;
    const pageIndex = Number(params.get("page"));
    await route.fulfill({
      json: {
        total: 21,
        page: pageIndex,
        size: 20,
        filters: {},
        rows:
          pageIndex === 1
            ? [
                {
                  id: "21",
                  bookingId: "44",
                  subject: "Última clase",
                  course: "001-A-2027",
                  teacher: "QA",
                  students: 20,
                  date: "2027-03-01",
                  start: "14:00",
                  end: "15:00",
                  room: "101",
                  type: "General",
                  cancelled: false,
                },
              ]
            : [],
      },
    });
  });
  await page.goto("/reservas?date=2027-03-01&page=9");
  await expect(page.getByText("Página 2 de 2")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Última clase" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/page=1/);
  await page.getByRole("button", { name: "Última clase" }).click();
  await expect(page).toHaveURL(
    /fecha=2027-03-01.*hora=14%3A00|fecha=2027-03-01.*hora=14:00/,
  );
  await page.goto("/reservas?date=2027-02-30");
  await expect(page.getByRole("alert")).toContainText(
    "fecha del listado no es válida",
  );
  expect(errors).toEqual([]);
});

test("identidad pendiente se recupera al reabrir sin guardar secretos", async ({
  page,
}) => {
  await fakeAuth(page);
  const user = {
    id: "8",
    version: 0,
    name: "QA",
    surname: "Cuenta",
    email: "qa@example.test",
    role: "Bedel",
    active: true,
  };
  let recovered = false;
  const operationId = "11111111-1111-4111-8111-111111111111";
  await page.route("**/api/administracion/cuentas**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/recuperar")) {
      expect(route.request().method()).toBe("POST");
      expect(route.request().postData()).toBeNull();
      recovered = true;
      await route.fulfill({
        json: { ...user, version: 1, email: "nuevo@example.test" },
      });
    } else if (url.pathname.endsWith("/operaciones-identidad")) {
      await route.fulfill({
        json: {
          operations: recovered
            ? []
            : [
                {
                  operationId,
                  type: "EMAIL",
                  state: "CONFIRMADA",
                  recoverable: true,
                },
              ],
        },
      });
    } else
      await route.fulfill({
        json: { items: [user], total: 1, page: 1, size: 20, activeAdmins: 1 },
      });
  });
  await page.goto("/administracion");
  await login(page, "admin");
  await page.getByRole("button", { name: "Editar qa@example.test" }).click();
  await expect(
    page.getByRole("button", { name: "Guardar cuenta", exact: true }),
  ).toBeDisabled();
  await expect(page.getByText(operationId, { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Editar qa@example.test" }).click();
  await expect(
    page.getByRole("button", { name: "Recuperar operación pendiente" }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Editar qa@example.test" }).click();
  await page
    .getByRole("button", { name: "Recuperar operación pendiente" })
    .click();
  await expect(page.getByLabel("Correo de acceso")).toHaveValue(
    "nuevo@example.test",
  );
  await expect(page.getByRole("status")).toContainText(
    "Operación de identidad recuperada",
  );
});

test("contraseña incierta cerrada exige otra petición explícita con nuevo UUID", async ({
  page,
}) => {
  await fakeAuth(page);
  const user = {
    id: "8",
    version: 0,
    name: "QA",
    surname: "Cuenta",
    email: "qa@example.test",
    role: "Bedel",
    active: true,
  };
  const ids: string[] = [];
  await page.route("**/api/administracion/cuentas**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/operaciones-identidad"))
      await route.fulfill({
        json: {
          operations: [],
          warnings:
            ids.length === 1
              ? [
                  {
                    operationId: ids[0],
                    type: "PASSWORD",
                    state: "INCIERTA",
                    recoverable: false,
                    at: "2026-10-07T18:00:00",
                    message:
                      "El proveedor pudo cambiar la contraseña. Establecé otra mediante un intento explícito.",
                  },
                ]
              : [],
        },
      });
    else if (url.pathname.endsWith("/password")) {
      ids.push(route.request().postDataJSON().operationId);
      if (ids.length === 1)
        await route.fulfill({
          status: 503,
          json: {
            code: "PASSWORD_UNCERTAIN",
            message:
              "El proveedor pudo cambiar la contraseña. Esta operación quedó rechazada; establecé otra explícitamente.",
          },
        });
      else await route.fulfill({ json: user });
    } else
      await route.fulfill({
        json: { items: [user], total: 1, page: 1, size: 20, activeAdmins: 1 },
      });
  });
  await page.goto("/administracion");
  await login(page, "admin");
  await page.getByRole("button", { name: "Editar qa@example.test" }).click();
  await page
    .getByRole("button", { name: "Establecer contraseña", exact: true })
    .click();
  await page.getByLabel("Nueva contraseña", { exact: true }).fill("Primera123");
  await page
    .getByLabel("Confirmar contraseña", { exact: true })
    .fill("Primera123");
  await page.getByRole("button", { name: "Guardar contraseña" }).click();
  await expect(page.getByRole("alert")).toContainText("pudo cambiar");
  await expect(
    page.getByLabel("Nueva contraseña", { exact: true }),
  ).toHaveValue("");
  await page.reload();
  await page.getByRole("button", { name: "Editar qa@example.test" }).click();
  await expect(page.getByRole("status")).toContainText(
    "mediante un intento explícito",
  );
  await page
    .getByRole("button", { name: "Establecer contraseña", exact: true })
    .click();
  await page.getByLabel("Nueva contraseña", { exact: true }).fill("Segunda123");
  await page
    .getByLabel("Confirmar contraseña", { exact: true })
    .fill("Segunda123");
  await page.getByRole("button", { name: "Guardar contraseña" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Contraseña actualizada",
  );
  expect(new Set(ids).size).toBe(2);
  expect(
    await page.evaluate(() => JSON.stringify(sessionStorage)),
  ).not.toContain("123");
});

test("agenda actualiza referencias si otra sesión agregó un aula ocupada", async ({
  page,
}) => {
  await fakeAuth(page);
  let referenceCalls = 0;
  await page.route("**/api/referencias/aulas", (route) => {
    referenceCalls++;
    return route.fulfill({
      json:
        referenceCalls === 1
          ? []
          : [
              {
                id: "303",
                capacity: 40,
                type: "General",
                state: "Habilitada",
                history: [
                  {
                    at: "2027-01-01T00:00",
                    state: "Habilitada",
                    type: "General",
                  },
                ],
              },
            ],
    });
  });
  await page.route("**/api/consultas/agenda?*", (route) =>
    route.fulfill({
      json: {
        total: 1,
        page: 0,
        size: 20,
        filters: {},
        rows: [
          {
            id: "1",
            bookingId: "44",
            subject: "Clase aula nueva",
            course: "001-A-2027",
            teacher: "QA",
            students: 20,
            date: "2027-03-01",
            start: "14:00",
            end: "15:00",
            room: "303",
            type: "General",
            cancelled: false,
          },
        ],
      },
    }),
  );
  await page.goto("/agenda?fecha=2027-03-01");
  await login(page);
  await expect(
    page.getByRole("button", { name: /Clase aula nueva/ }),
  ).toBeVisible();
  expect(referenceCalls).toBe(2);
  await expect(page.getByText(/aulas pendientes de actualizar/)).toHaveCount(0);
});

test("patrón sin futuras permite cambiar aula antes de ampliar calendario", async ({
  page,
}) => {
  await fakeAuth(page);
  await page.route("**/api/referencias/calendarios", (route) =>
    route.fulfill({
      json: [
        {
          year: 2027,
          state: "Habilitado",
          terms: {
            first: ["2027-03-01", "2027-07-01"],
            second: ["2027-08-01", "2027-12-01"],
          },
          holidays: [],
          descriptions: {},
        },
      ],
    }),
  );
  await page.route("**/api/reservas/44", (route) =>
    route.fulfill({
      json: {
        id: "44",
        version: 1,
        subject: "Serie QA",
        course: "001-A-2027",
        teacher: "QA",
        students: 20,
        patterns: [{ day: 1, start: "14:00", end: "15:00", room: "101" }],
        schedule: { year: 2027, period: "first", excluded: [] },
        occurrences: [
          {
            id: "1",
            date: "2020-03-01",
            start: "14:00",
            end: "15:00",
            room: "101",
          },
        ],
      },
    }),
  );
  await page.route("**/api/reservas/44/aulas/opciones", (route) =>
    route.fulfill({
      json: {
        reservationId: "44",
        version: 1,
        periodic: true,
        groups: [
          {
            groupId: "p:1",
            label: "Lunes 14:00–15:00 · patrón completo",
            detailIds: [],
            classes: [],
            availableRooms: [
              { internalId: "2", id: "102", version: 1, capacity: 30 },
            ],
          },
        ],
      },
    }),
  );
  await page.route("**/api/reservas/44/aulas/preparacion", (route) =>
    route.fulfill({
      json: {
        reservationId: "44",
        version: 1,
        changes: [],
        patterns: [{ groupId: "p:1", newRoom: "102" }],
      },
    }),
  );
  await page.route("**/api/reservas/44/aulas/confirmacion", async (route) => {
    const body = route.request().postDataJSON();
    expect(body.selections[0].detailIds).toEqual([]);
    await route.fulfill({ json: { operationId: body.operationId } });
  });
  await page.goto("/reservas/44");
  await login(page);
  await page.getByRole("button", { name: "Cambiar aula", exact: true }).click();
  await page.getByRole("checkbox").check();
  await page.getByLabel(/Nueva aula/).selectOption("2");
  await page.getByRole("button", { name: "Revisar cambio de aulas" }).click();
  await expect(page.getByText("0 clases afectadas")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Patrones semanales a actualizar" }),
  ).toBeVisible();
  await expect(page.getByText(/Lunes 14:00–15:00.*Aula 102/)).toBeVisible();
  await page.getByRole("button", { name: "Confirmar cambio de aulas" }).click();
  await expect(
    page.getByRole("heading", { name: "Cambio de aulas confirmado" }),
  ).toBeVisible();
});
