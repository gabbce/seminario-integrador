import { test, expect, type Page } from "@playwright/test";
import {
  readFileSync,
  mkdirSync,
  writeFileSync,
  existsSync,
  rmSync,
} from "node:fs";
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
  test("paquete Auth real " + role, async ({ page, browserName }) => {
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
      path: "../artifacts/qa/package/" + role + "-" + browserName + ".png",
      fullPage: true,
    });
    expect(externalAssets).toEqual([]);
  });

test("paquete: indicadores, impresión completa, teclado y reflow", async ({
  page,
  browserName,
}) => {
  mkdirSync("../artifacts/qa/package", { recursive: true });
  const output = "../artifacts/qa/package/volume-" + browserName + ".pdf";
  rmSync(output, { force: true });
  await page.addInitScript(() => {
    const nativePrint = window.print.bind(window);
    window.addEventListener("qa-native-print", () => nativePrint());
    window.print = () => {
      document.documentElement.dataset.printed = "yes";
    };
  });
  await login(page, "bedel");
  await page.goto("/reservas?date=2027-08-23&page=1&size=20");
  await expect(page.locator(".screen-list tbody tr")).toHaveCount(20);
  const print = page.getByRole("button", { name: "Imprimir listado diario" });
  await print.focus();
  await expect(print).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-printed", "yes");
  await expect(page.locator(".print-list tbody tr")).toHaveCount(104);
  const rows = await page
    .locator(".print-list tbody tr")
    .evaluateAll((elements) =>
      elements.map((e) => ({
        id: e.getAttribute("data-occurrence-id"),
        text: (e as HTMLElement).innerText,
      })),
    );
  expect(new Set(rows.map((r) => r.id)).size).toBe(104);
  writeFileSync(
    "../artifacts/qa/package/print-rows-" + browserName + ".json",
    JSON.stringify(rows),
  );
  if (browserName === "chromium")
    await page.pdf({ path: output, format: "A4", landscape: true });
  else {
    await page.evaluate(() =>
      window.dispatchEvent(new Event("qa-native-print")),
    );
    await expect
      .poll(
        () =>
          existsSync(output) &&
          readFileSync(output).subarray(-100).toString().includes("%%EOF"),
        { timeout: 30000 },
      )
      .toBeTruthy();
  }
  await page.goto("/indicadores?date=2027-08-23");
  await expect(
    page.getByText("52 / 320 h habilitadas", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("780", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("img", { name: /Alumnos previstos. Pico 125/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: /Clases simultáneas. Pico 8/ }),
  ).toBeVisible();
  await page.screenshot({
    path: "../artifacts/qa/package/indicators-" + browserName + ".png",
    fullPage: true,
  });
  await page.goto("/indicadores?mode=week&from=2027-08-23&to=2027-08-27");
  await expect(
    page.getByText("56 / 1.600 h habilitadas", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("855", { exact: true })).toBeVisible();
  // Half-size CSS viewport verifies the reflow equivalent of 200% desktop zoom; manual browser zoom remains in QA.
  await page.setViewportSize({ width: 683, height: 384 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "../artifacts/qa/package/reflow-" + browserName + ".png",
    fullPage: true,
  });
});
