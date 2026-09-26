import { test, expect, type Page } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
const password =
  process.env.AULAS_DEMO_PASSWORD ||
  readFileSync("../backend/.env", "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith("AULAS_DEMO_PASSWORD="))
    ?.slice("AULAS_DEMO_PASSWORD=".length)
    .replaceAll("\\\\", "\\");
// Revoke only each temporary browser session; preserve other signed-in sessions.
test.afterEach(async ({ page }) => {
  const token = await page
    .evaluate(
      () =>
        JSON.parse(localStorage.getItem("aulas-auth") || "null")?.access_token,
    )
    .catch(() => null);
  if (!token) return;
  const config = Object.fromEntries(
    readFileSync(".env.local", "utf8")
      .split(/\r?\n/)
      .filter((l) => l.includes("=") && !l.startsWith("#"))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i), l.slice(i + 1)];
      }),
  );
  const response = await fetch(
    config.VITE_SUPABASE_URL + "/auth/v1/logout?scope=local",
    {
      method: "POST",
      headers: {
        apikey: config.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: "Bearer " + token,
      },
    },
  );
  expect(response.ok, "Cierre de sesión temporal local").toBeTruthy();
});

async function login(page: Page, role: string) {
  await page.goto("/reservas/24");
  await page.getByLabel("Correo electrónico").fill(role + "@demo.local");
  await page.getByLabel("Contraseña", { exact: true }).fill(password!);
  const profile = page.waitForResponse((r) => r.url().endsWith("/api/me"));
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  expect((await profile).status()).toBe(role === "inhabilitado" ? 403 : 200);
  if (role !== "inhabilitado") {
    await expect(page.getByLabel("Fecha de agenda")).toBeVisible();
    await page.goto("/reservas/24");
  }
}
test("paquete sirve rutas profundas y assets; API mantiene errores JSON", async ({
  request,
}) => {
  for (const path of ["/", "/reservas/24", "/administracion/calendario"]) {
    const r = await request.get(path);
    expect(r.status()).toBe(200);
    expect(r.headers()["content-type"]).toContain("text/html");
    const body = await r.text();
    expect(body).toContain("/assets/");
    expect(body).not.toContain("/src/main.tsx");
  }
  expect((await request.get("/favicon.svg")).status()).toBe(200);
  expect((await request.get("/assets/no-existe.js")).status()).toBe(404);
  const api = await request.get("/api/consultas/listado?date=2027-08-23");
  expect(api.status()).toBe(401);
  expect(api.headers()["content-type"]).toContain("application/json");
  expect((await request.get("/api/health")).status()).toBe(200);
});
for (const role of ["admin", "bedel", "docente", "inhabilitado"])
  test("paquete Auth real " + role, async ({ page }) => {
    mkdirSync("../artifacts/qa/package", { recursive: true });
    const externalAssets: string[] = [];
    page.on("request", (r) => {
      if (
        ["stylesheet", "font", "script", "image"].includes(r.resourceType()) &&
        new URL(r.url()).origin !== new URL(page.url()).origin
      )
        externalAssets.push(r.url());
    });
    await login(page, role);
    if (role === "inhabilitado") {
      await expect(page.getByRole("alert")).toContainText("habilitado");
      return;
    }
    await expect(
      page.getByRole("heading", { name: "Historia", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Administración", exact: true }),
    ).toHaveCount(role === "admin" ? 1 : 0);
    await expect(
      page.getByRole("link", { name: "Indicadores", exact: true }),
    ).toHaveCount(role === "docente" ? 0 : 1);
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Historia", exact: true }),
    ).toBeVisible();
    await page.goto("/reservas?date=2027-08-23&page=1&size=20");
    await expect(page.locator(".screen-list tbody tr")).toHaveCount(20);
    if (role === "docente")
      await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: "../artifacts/qa/package/" + role + ".png",
      fullPage: true,
    });
    expect(externalAssets).toEqual([]);
  });
