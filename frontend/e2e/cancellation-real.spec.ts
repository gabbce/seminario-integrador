import { test, expect } from "./real-session-fixture";
import { readFileSync } from "node:fs";
const lines = readFileSync("../backend/.env", "utf8").split(/\r?\n/);
const password =
  process.env.AULAS_DEMO_PASSWORD ||
  lines
    .find((l) => l.startsWith("AULAS_DEMO_PASSWORD="))
    ?.slice("AULAS_DEMO_PASSWORD=".length)
    .replaceAll("\\\\", "\\");
if (!password) throw Error("Configurar AULAS_DEMO_PASSWORD localmente.");
// Explicit opt-in: creates only labelled fictional records and keeps them for QA.
test("I04.2 real cancelación, recarga, segunda sesión y aula reutilizable", async ({
  page,
  browser,
}) => {
  test.setTimeout(240000);
  await page.goto("/");
  await page.getByLabel("Correo electrónico").fill("bedel@demo.local");
  await page.getByLabel("Contraseña", { exact: true }).fill(password!);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page.getByLabel("Fecha de agenda")).toBeVisible();
  const created = await page.evaluate(async () => {
    const session = JSON.parse(localStorage.getItem("aulas-auth")!);
    async function call(path: string, body: unknown) {
      const r = await fetch(`/api${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw Error(`QA API ${r.status}`);
      return r.json();
    }
    const course = await call("/referencias/cursos", {
      subject: "QA I04 Cancelaciones",
      commission: "QA",
      year: 2027,
    });
    const proposal = {
      year: 2027,
      courseId: course.id,
      students: 20,
      type: "General",
      board: "",
      resources: [],
      dates: [
        { date: "2027-07-22", start: "11:00", modules: 2 },
        { date: "2027-07-23", start: "11:00", modules: 2 },
      ],
    };
    const ready = await call("/reservas/esporadicas/preparacion", proposal);
    const selections = ready.dates.map(
      (d: {
        date: string;
        availableRooms: { internalId: string; version: number }[];
      }) => ({
        date: d.date,
        roomId: d.availableRooms[0].internalId,
        roomVersion: d.availableRooms[0].version,
      }),
    );
    const booking = await call("/reservas/esporadicas/confirmacion", {
      operationId: crypto.randomUUID(),
      proposal,
      teacherId: "D-01",
      calendarVersion: ready.calendarVersion,
      selections,
    });
    return { booking, proposal, selections };
  });
  await page.goto(`/reservas/${created.booking.id}`);
  await page
    .getByRole("button", { name: "Cancelar clases", exact: true })
    .click();
  await page.getByRole("button", { name: "Todas las futuras (2)" }).click();
  await page
    .getByLabel("Motivo de cancelación")
    .fill("QA I04.2: actividad suspendida; verificar liberación de aula");
  await page
    .getByRole("button", { name: "Revisar cancelación", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Revisar cancelación", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: `../artifacts/qa/operations/${browser.browserType().name()}-i042-real-review.png`, fullPage: true });
  await page
    .getByRole("button", { name: "Confirmar cancelación", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Cancelación confirmada" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ver detalle actualizado" }).click();
  await page.reload();
  await expect(
    page.getByText(`${created.booking.id} · CANCELADA`, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Motivo: QA I04.2", { exact: false }),
  ).toHaveCount(2);
  await page.screenshot({
    path: `../artifacts/qa/operations/${browser.browserType().name()}-i042-real-cancelled.png`,
    fullPage: true,
  });
  const replacement = await page.evaluate(async ({ proposal, selections }) => {
    const session = JSON.parse(localStorage.getItem("aulas-auth")!);
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    };
    const r = await fetch("/api/reservas/esporadicas/preparacion", {
      method: "POST",
      headers,
      body: JSON.stringify(proposal),
    });
    if (!r.ok) throw Error(`Preparación ${r.status}`);
    const ready = await r.json();
    for (const s of selections) {
      if (
        !ready.dates
          .find((d: { date: string }) => d.date === s.date)
          .availableRooms.some(
            (a: { internalId: string }) => a.internalId === s.roomId,
          )
      )
        throw Error("El aula cancelada no fue liberada");
    }
    const saved = await fetch("/api/reservas/esporadicas/confirmacion", {
      method: "POST",
      headers,
      body: JSON.stringify({
        operationId: crypto.randomUUID(),
        proposal,
        teacherId: "D-01",
        calendarVersion: ready.calendarVersion,
        selections,
      }),
    });
    if (!saved.ok) throw Error(`Reutilización ${saved.status}`);
    return saved.json();
  }, created);
  const second = await browser.newPage({
    viewport: { width: 390, height: 1000 },
  });
  try {
    await second.goto("/");
    await second.getByLabel("Correo electrónico").fill("docente@demo.local");
    await second.getByLabel("Contraseña", { exact: true }).fill(password!);
    await second.getByRole("button", { name: "Ingresar", exact: true }).click();
    await expect(second.getByLabel("Fecha de agenda")).toBeVisible();
    const response = second.waitForResponse((r) =>
      r.url().endsWith(`/api/reservas/${created.booking.id}`),
    );
    await second.goto(`/reservas/${created.booking.id}`);
    const data = await (await response).json();
    expect(data).not.toHaveProperty("teacherEmail");
    expect(data).not.toHaveProperty("registrant");
    expect(
      data.occurrences.every(
        (o: {
          cancelled: boolean;
          cancellation: { reason: string; actor?: string };
        }) => o.cancelled && o.cancellation.reason && !o.cancellation.actor,
      ),
    ).toBe(true);
    await expect(
      second.getByText(`${created.booking.id} · CANCELADA`, { exact: true }),
    ).toBeVisible();
    await second.screenshot({
      path: `../artifacts/qa/operations/${browser.browserType().name()}-i042-real-docente-390.png`,
      fullPage: true,
    });
  } finally {
    await second.close();
  }
  console.log(
    `I04.2 QA: reserva cancelada ${created.booking.id}; reemplazo en mismas aulas/fechas ${replacement.id}; curso ${created.booking.courseId}.`,
  );
});
