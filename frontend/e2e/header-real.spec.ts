import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const lines = readFileSync("../backend/.env", "utf8").split(/\r?\n/);
const password =
  process.env.AULAS_DEMO_PASSWORD ||
  lines
    .find((l) => l.startsWith("AULAS_DEMO_PASSWORD="))
    ?.slice("AULAS_DEMO_PASSWORD=".length)
    .replaceAll("\\\\", "\\");
if (!password) throw Error("Configurar AULAS_DEMO_PASSWORD localmente.");
// Opt-in: preserves a labelled fictional booking for manual QA.
test("I04.3a real cabecera, recarga, historial y privacidad", async ({ page, browser }) => {
  test.setTimeout(240000);
  await page.goto("/");
  await page.getByLabel("Correo electrónico").fill("bedel@demo.local");
  await page.getByLabel("Contraseña", { exact: true }).fill(password!);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page.getByLabel("Fecha de agenda")).toBeVisible();
  const booking = await page.evaluate(async () => {
    const session = JSON.parse(localStorage.getItem("aulas-auth")!);
    async function call(path: string, body: unknown) {
      const r = await fetch(`/api${path}`, { method: "POST", headers: {
        "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}`,
      }, body: JSON.stringify(body) });
      if (!r.ok) throw Error(`QA API ${r.status}`);
      return r.json();
    }
    const course = await call("/referencias/cursos", { subject: "QA I04 Cabecera", commission: "QA", year: 2027 });
    const proposal = { year: 2027, courseId: course.id, students: 25, type: "General", board: "", resources: [],
      dates: [{ date: "2027-07-26", start: "11:00", modules: 2 }, { date: "2027-07-28", start: "11:00", modules: 2 }] };
    const ready = await call("/reservas/esporadicas/preparacion", proposal);
    const selections = ready.dates.map((d: { date: string; availableRooms: { internalId: string; version: number }[] }) => ({
      date: d.date, roomId: d.availableRooms[0].internalId, roomVersion: d.availableRooms[0].version,
    }));
    return call("/reservas/esporadicas/confirmacion", { operationId: crypto.randomUUID(), proposal: { ...proposal, students: 20 },
      teacherId: "D-01", calendarVersion: ready.calendarVersion, selections });
  });
  await page.goto(`/reservas/${booking.id}`);
  await page.getByRole("button", { name: "Modificar datos", exact: true }).click();
  await page.getByLabel("Alumnos previstos", { exact: true }).fill("9999");
  await page.getByRole("button", { name: "Guardar datos", exact: true }).click();
  await expect(page.getByText("no cumplen los nuevos requisitos", { exact: false })).toBeVisible();
  await page.screenshot({ path: "/tmp/i043a-real-conflict.png", fullPage: true });
  await page.getByLabel("Alumnos previstos", { exact: true }).fill("25");
  await page.getByLabel("Docente", { exact: true }).selectOption("Ana Ruiz");
  await page.getByRole("button", { name: "Guardar datos", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Datos de la reserva actualizados", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Ver detalle actualizado" }).click();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Historial de cambios", exact: true })).toBeVisible();
  await expect(page.getByText("alumnos 20 → 25", { exact: false })).toBeVisible();
  await page.screenshot({ path: "/tmp/i043a-real-history.png", fullPage: true });
  const second = await browser.newPage({ viewport: { width: 390, height: 1000 } });
  try {
    await second.goto("/");
    await second.getByLabel("Correo electrónico").fill("docente@demo.local");
    await second.getByLabel("Contraseña", { exact: true }).fill(password!);
    await second.getByRole("button", { name: "Ingresar", exact: true }).click();
    await expect(second.getByLabel("Fecha de agenda")).toBeVisible();
    const response = second.waitForResponse(r => r.url().endsWith(`/api/reservas/${booking.id}`));
    await second.goto(`/reservas/${booking.id}`);
    const data = await (await response).json();
    expect(data).not.toHaveProperty("teacherEmail");
    expect(data).not.toHaveProperty("registrant");
    expect(data).not.toHaveProperty("changes");
    expect(data.students).toBe(25);
    expect(data.teacherId).toBe("D-02");
    expect(data.occurrences).toEqual(booking.occurrences);
    await expect(second.getByRole("heading", { name: "QA I04 Cabecera", exact: true })).toBeVisible();
    await expect(second.getByRole("button", { name: "Modificar datos", exact: true })).toHaveCount(0);
    await second.screenshot({ path: "/tmp/i043a-real-docente-390.png", fullPage: true });
  } finally { await second.close(); }
  console.log(`I04.3a QA: reserva ${booking.id}; curso ${booking.courseId}; alumnos 20 → 25; docente D-01 → D-02; fechas/aulas conservadas.`);
});
