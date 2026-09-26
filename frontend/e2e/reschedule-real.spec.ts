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
// Opt-in: two labelled bookings, preserved for manual QA. No existing QA is edited.
for (const periodic of [false, true]) test(`I04.4 real reprogramación ${periodic ? "periódica" : "esporádica"}`, async ({ page, browser }) => {
  test.setTimeout(300000);
  await page.goto("/");await page.getByLabel("Correo electrónico").fill("bedel@demo.local");await page.getByLabel("Contraseña", { exact: true }).fill(password!);await page.getByRole("button", { name: "Ingresar", exact: true }).click();await expect(page.getByLabel("Fecha de agenda")).toBeVisible();
  const booking = await page.evaluate(async periodic => {
    const session = JSON.parse(localStorage.getItem("aulas-auth")!);
    async function call(path: string, body: unknown) {
      const r = await fetch(`/api${path}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify(body) });if (!r.ok) throw Error(`QA API ${r.status}`);return r.json();
    }
    const course = await call("/referencias/cursos", { subject: periodic ? "QA I04 Reprogramar periódica" : "QA I04 Reprogramar esporádica", commission: "QA", year: 2027 });
    const proposal = { year: 2027, courseId: course.id, students: 20, type: "General", board: "", resources: [], ...(periodic ? { period: "first", excluded: [], patterns: [{ day: 4, start: "19:00", modules: 2 }] } : { dates: [{ date: "2027-08-10", start: "11:00", modules: 2 }, { date: "2027-08-12", start: "11:00", modules: 2 }] }) };
    const path = periodic ? "/reservas/periodicas" : "/reservas/esporadicas";const ready = await call(`${path}/preparacion`, proposal);
    const selections = periodic ? ready.patterns.map((p: { day: number; dates: string[]; availableRooms: { internalId: string; version: number }[] }) => ({ day: p.day, dates: p.dates, roomId: p.availableRooms[0].internalId, roomVersion: p.availableRooms[0].version })) : ready.dates.map((d: { date: string; availableRooms: { internalId: string; version: number }[] }) => ({ date: d.date, roomId: d.availableRooms[0].internalId, roomVersion: d.availableRooms[0].version }));
    return call(`${path}/confirmacion`, { operationId: crypto.randomUUID(), proposal, teacherId: "D-01", calendarVersion: ready.calendarVersion, selections });
  }, periodic);
  const original = booking.occurrences[0];
  const shifted = (days: number) => { const date = new Date(`${original.date}T12:00:00Z`);date.setUTCDate(date.getUTCDate() + days);return date.toISOString().slice(0, 10); };
  const firstDate = shifted(1), secondDate = shifted(periodic ? 4 : 3);
  await page.goto(`/reservas/${booking.id}`);
  for (const [index, date] of [firstDate, secondDate].entries()) {
    await page.getByRole("button", { name: "Reprogramar clases", exact: true }).click();await page.getByRole("checkbox").first().check();
    await page.getByLabel("Nueva fecha", { exact: true }).fill(date);await page.getByLabel("Nuevo inicio", { exact: true }).fill("18:00");await page.getByRole("combobox", { name: "Duración", exact: true }).selectOption("90");
    await page.getByRole("button", { name: "Revisar reprogramación", exact: true }).click();await expect(page.getByRole("heading", { name: "Revisar nuevas fechas", exact: true })).toBeVisible();
    await page.screenshot({ path: `../artifacts/qa/operations/${browser.browserType().name()}-i044-real-review-${periodic}-${index}.png`, fullPage: true });
    await page.getByRole("button", { name: "Guardar reprogramación", exact: true }).click();await expect(page.getByRole("heading", { name: "Reprogramación confirmada" })).toBeVisible();await page.getByRole("button", { name: "Ver detalle actualizado" }).click();await page.reload();await expect(page.getByRole("heading", { name: "Historial de cambios", exact: true })).toBeVisible();
  }
  await page.screenshot({ path: `../artifacts/qa/operations/${browser.browserType().name()}-i044-real-history-${periodic}.png`, fullPage: true });
  const second = await browser.newPage({ viewport: { width: 390, height: 1000 } });
  try {
    await second.goto("/");await second.getByLabel("Correo electrónico").fill("docente@demo.local");await second.getByLabel("Contraseña", { exact: true }).fill(password!);await second.getByRole("button", { name: "Ingresar", exact: true }).click();await expect(second.getByLabel("Fecha de agenda")).toBeVisible();
    const response = second.waitForResponse(r => r.url().endsWith(`/api/reservas/${booking.id}`));await second.goto(`/reservas/${booking.id}`);const data = await (await response).json();
    const changed = data.occurrences.find((c: { id: string }) => c.id === original.id);expect(changed).toMatchObject({ date: secondDate, start: "18:00", end: "19:30", room: original.room, originalDate: original.date });
    if (periodic) expect(data.patterns).toEqual(booking.patterns);
    expect(data).not.toHaveProperty("changes");expect(data).not.toHaveProperty("teacherEmail");expect(data).not.toHaveProperty("registrant");
    await expect(second.getByRole("heading", { name: booking.subject, exact: true })).toBeVisible();await expect(second.getByRole("button", { name: "Reprogramar clases", exact: true })).toHaveCount(0);await second.screenshot({ path: `../artifacts/qa/operations/${browser.browserType().name()}-i044-real-docente-${periodic}-390.png`, fullPage: true });
    console.log(`I04.4 QA reserva ${booking.id}; curso ${booking.courseId}; origen ${original.date}; primera ${firstDate}; segunda ${secondDate}; aula ${original.room}; patrón conservado ${periodic}.`);
  } finally { await second.close(); }
});
