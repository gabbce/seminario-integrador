import { test, expect } from "./real-session-fixture";
import { readFileSync } from "node:fs";
const lines = readFileSync("../backend/.env", "utf8").split(/\r?\n/);
const secret = (name: string) =>
  process.env[name] ||
  lines
    .find((l) => l.startsWith(`${name}=`))
    ?.slice(name.length + 1)
    .replaceAll("\\\\", "\\");
const adminPassword = secret("AULAS_ADMIN_PASSWORD"),
  demoPassword = secret("AULAS_DEMO_PASSWORD");
if (!adminPassword || !demoPassword)
  throw Error("Configurar contraseñas locales de QA.");
// Opt-in: adds a dedicated unused QA year and course, never changes shared 2026/2027 calendars.
test("I04.5 calendario y clases reales atómicos", async ({ page, browser }) => {
  test.setTimeout(300000);
  await page.goto("/");
  await page.getByLabel("Correo electrónico").fill("admin@demo.local");
  await page.getByLabel("Contraseña", { exact: true }).fill(adminPassword!);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page.getByLabel("Fecha de agenda")).toBeVisible();
  const fixture = await page.evaluate(async () => {
    const session = JSON.parse(localStorage.getItem("aulas-auth")!);
    async function call(path: string, body?: unknown) {
      const r = await fetch(`/api${path}`, {
        method: body ? "POST" : "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (!r.ok) throw Error(`QA API ${r.status}`);
      return r.json();
    }
    const calendars = await call("/referencias/calendarios");
    let year = 2028;
    while (calendars.some((c: { year: number }) => c.year === year)) year++;
    const created = await call("/administracion/calendarios", { year });
    let date = new Date(`${year}-03-01T12:00:00Z`);
    while (date.getUTCDay() !== 1) date.setUTCDate(date.getUTCDate() + 1);
    const day = (offset: number) => {
      const d = new Date(date);
      d.setUTCDate(d.getUTCDate() + offset);
      return d.toISOString().slice(0, 10);
    };
    const edit = {
      ...created,
      state: "Habilitado",
      terms: {
        first: [day(0), day(7)],
        second: [`${year}-08-01`, `${year}-11-30`],
      },
      holidays: [day(7)],
      descriptions: { [day(7)]: "QA I04 Impacto ficticio" },
    };
    const reviewed = await call(
      `/administracion/calendarios/${created.id}/impacto`,
      edit,
    );
    const saved = await call(
      `/administracion/calendarios/${created.id}/confirmacion`,
      {
        operationId: crypto.randomUUID(),
        proposal: edit,
        stamp: reviewed.stamp,
      },
    );
    const course = await call("/referencias/cursos", {
      subject: "QA I04 Impacto calendario",
      commission: "QA",
      year,
    });
    const proposal = {
      year,
      courseId: course.id,
      students: 20,
      type: "General",
      board: "",
      resources: [],
      period: "first",
      excluded: [],
      patterns: [{ day: 1, start: "18:00", modules: 2 }],
    };
    const ready = await call("/reservas/periodicas/preparacion", proposal);
    const booking = await call("/reservas/periodicas/confirmacion", {
      operationId: crypto.randomUUID(),
      proposal,
      teacherId: "D-01",
      calendarVersion: ready.calendarVersion,
      selections: ready.patterns.map(
        (p: {
          day: number;
          dates: string[];
          availableRooms: { internalId: string; version: number }[];
        }) => ({
          day: p.day,
          dates: p.dates,
          roomId: p.availableRooms[0].internalId,
          roomVersion: p.availableRooms[0].version,
        }),
      ),
    });
    return {
      calendar: saved.calendar,
      booking,
      first: day(0),
      holiday: day(7),
      extension: day(14),
    };
  });
  await page.goto("/administracion/calendario");
  await page
    .getByLabel("Año del calendario")
    .selectOption(String(fixture.calendar.year));
  await page.getByLabel("Fin 1", { exact: true }).fill(fixture.extension);
  await page
    .getByRole("button", { name: `Quitar ${fixture.holiday}`, exact: true })
    .click();
  await page
    .getByRole("button", { name: "Revisar impacto", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Impacto del cambio" }),
  ).toBeVisible();
  await expect(page.getByText(/Clases nuevas: 2/)).toBeVisible();
  await page.screenshot({ path: `../artifacts/qa/operations/${browser.browserType().name()}-i045-real-review.png`, fullPage: true });
  await page
    .getByRole("button", {
      name: "Confirmar cambio de calendario",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Calendario y clases actualizados.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Fin 1", { exact: true })).toHaveValue(
    fixture.extension,
  );
  await expect(
    page.getByRole("button", {
      name: `Quitar ${fixture.holiday}`,
      exact: true,
    }),
  ).toHaveCount(0);
  await page.goto(`/reservas/${fixture.booking.id}`);
  await expect(
    page.getByRole("heading", { name: "Historial de cambios" }),
  ).toBeVisible();
  await page.screenshot({ path: `../artifacts/qa/operations/${browser.browserType().name()}-i045-real-history.png`, fullPage: true });
  const second = await browser.newPage({
    viewport: { width: 390, height: 1000 },
  });
  try {
    await second.goto("/");
    await second.getByLabel("Correo electrónico").fill("docente@demo.local");
    await second.getByLabel("Contraseña", { exact: true }).fill(demoPassword!);
    await second.getByRole("button", { name: "Ingresar", exact: true }).click();
    await expect(second.getByLabel("Fecha de agenda")).toBeVisible();
    const response = second.waitForResponse((r) =>
      r.url().endsWith(`/api/reservas/${fixture.booking.id}`),
    );
    await second.goto(`/reservas/${fixture.booking.id}`);
    const data = await (await response).json();
    expect(data.occurrences.map((o: { date: string }) => o.date)).toEqual([
      fixture.first,
      fixture.holiday,
      fixture.extension,
    ]);
    expect(data.patterns).toEqual(fixture.booking.patterns);
    expect(data).not.toHaveProperty("changes");
    expect(data).not.toHaveProperty("teacherEmail");
    expect(data).not.toHaveProperty("registrant");
    await expect(
      second.getByRole("heading", {
        name: fixture.booking.subject,
        exact: true,
      }),
    ).toBeVisible();
    await second.screenshot({
      path: `../artifacts/qa/operations/${browser.browserType().name()}-i045-real-docente-390.png`,
      fullPage: true,
    });
    console.log(
      `I04.5 QA año ${fixture.calendar.year}, id ${fixture.calendar.id}, reserva ${fixture.booking.id}, curso ${fixture.booking.courseId}; clases ${fixture.first}, ${fixture.holiday}, ${fixture.extension}; aula ${data.occurrences[0].room}.`,
    );
  } finally {
    await second.close();
  }
});
