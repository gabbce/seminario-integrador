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
// Explicit opt-in: creates labelled fictional records and preserves them for QA.
for (const periodic of [false, true]) test(`I04.3b real aulas ${periodic ? "patrón completo" : "fechas"}`, async ({ page, browser }) => {
  test.setTimeout(240000);
  await page.goto("/");
  await page.getByLabel("Correo electrónico").fill("bedel@demo.local");
  await page.getByLabel("Contraseña", { exact: true }).fill(password!);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page.getByLabel("Fecha de agenda")).toBeVisible();
  const booking = await page.evaluate(async periodic => {
    const session = JSON.parse(localStorage.getItem("aulas-auth")!);
    async function call(path: string, body: unknown) {
      const r = await fetch(`/api${path}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify(body) });
      if (!r.ok) throw Error(`QA API ${r.status}`);return r.json();
    }
    const course = await call("/referencias/cursos", { subject: periodic ? "QA I04 Aulas periódicas" : "QA I04 Aulas esporádicas", commission: "QA", year: 2027 });
    const proposal = { year: 2027, courseId: course.id, students: 20, type: "General", board: "", resources: [],
      ...(periodic ? { period: "first", excluded: [], patterns: [{ day: 5, start: "20:00", modules: 2 }] } : { dates: [{ date: "2027-07-30", start: "11:00", modules: 2 }, { date: "2027-08-03", start: "11:00", modules: 2 }] }) };
    const path = periodic ? "/reservas/periodicas" : "/reservas/esporadicas";
    const ready = await call(`${path}/preparacion`, proposal);
    const selections = periodic ? ready.patterns.map((p: { day: number; dates: string[]; availableRooms: { internalId: string; version: number }[] }) => ({ day: p.day, dates: p.dates, roomId: p.availableRooms[0].internalId, roomVersion: p.availableRooms[0].version })) : ready.dates.map((d: { date: string; availableRooms: { internalId: string; version: number }[] }) => ({ date: d.date, roomId: d.availableRooms[0].internalId, roomVersion: d.availableRooms[0].version }));
    return call(`${path}/confirmacion`, { operationId: crypto.randomUUID(), proposal, teacherId: "D-01", calendarVersion: ready.calendarVersion, selections });
  }, periodic);
  await page.goto(`/reservas/${booking.id}`);
  await page.getByRole("button", { name: "Cambiar aula", exact: true }).click();
  const boxes = page.getByRole("checkbox");await expect(boxes.first()).toBeVisible();
  for (let i = 0; i < await boxes.count(); i++) {
    await boxes.nth(i).check();
    const select = page.getByRole("combobox").nth(i);
    const value = await select.locator("option").nth(1).getAttribute("value");
    await select.selectOption(value!);
  }
  await page.screenshot({ path: `../artifacts/qa/operations/${browser.browserType().name()}-i043b-real-selection-${periodic}.png`, fullPage: true });
  await page.getByRole("button", { name: "Revisar cambio de aulas", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Revisar cambio de aulas", exact: true })).toBeVisible();
  await page.screenshot({ path: `../artifacts/qa/operations/${browser.browserType().name()}-i043b-real-review-${periodic}.png`, fullPage: true });
  await page.getByRole("button", { name: "Confirmar cambio de aulas", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Cambio de aulas confirmado" })).toBeVisible();
  await page.getByRole("button", { name: "Ver detalle actualizado" }).click();await page.reload();
  await expect(page.getByRole("heading", { name: "Historial de cambios", exact: true })).toBeVisible();
  await page.screenshot({ path: `../artifacts/qa/operations/${browser.browserType().name()}-i043b-real-history-${periodic}.png`, fullPage: true });
  const second = await browser.newPage({ viewport: { width: 390, height: 1000 } });
  try {
    await second.goto("/");await second.getByLabel("Correo electrónico").fill("docente@demo.local");await second.getByLabel("Contraseña", { exact: true }).fill(password!);
    await second.getByRole("button", { name: "Ingresar", exact: true }).click();await expect(second.getByLabel("Fecha de agenda")).toBeVisible();
    const response = second.waitForResponse(r => r.url().endsWith(`/api/reservas/${booking.id}`));await second.goto(`/reservas/${booking.id}`);const data = await (await response).json();
    expect(data).not.toHaveProperty("teacherEmail");expect(data).not.toHaveProperty("registrant");expect(data).not.toHaveProperty("changes");
    type Occurrence = { id: string; date: string; start: string; end: string; room: string };
    for (const original of booking.occurrences as Occurrence[]) {
      const current = data.occurrences.find((c: Occurrence) => c.id === original.id);
      expect(current).toMatchObject({ date: original.date, start: original.start, end: original.end });expect(current.room).not.toBe(original.room);
      if (periodic) expect(current.room).toBe(data.patterns[0].room);
    }
    await expect(second.getByRole("heading", { name: booking.subject, exact: true })).toBeVisible();
    await expect(second.getByRole("button", { name: "Cambiar aula", exact: true })).toHaveCount(0);
    await second.screenshot({ path: `../artifacts/qa/operations/${browser.browserType().name()}-i043b-real-docente-${periodic}-390.png`, fullPage: true });
    console.log(`I04.3b QA: reserva ${booking.id}; curso ${booking.courseId}; modalidad ${periodic ? "periódica" : "esporádica"}; ${data.occurrences.length} clases; aula nueva ${data.occurrences[0].room}.`);
  } finally { await second.close(); }
});
