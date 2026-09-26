import { test, expect, firefox } from "@playwright/test";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  rmSync,
} from "node:fs";
import { resolve } from "node:path";
const password =
  process.env.AULAS_DEMO_PASSWORD ||
  readFileSync("../backend/.env", "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith("AULAS_DEMO_PASSWORD="))
    ?.slice("AULAS_DEMO_PASSWORD=".length)
    .replaceAll("\\\\", "\\");
// Read only. Requires explicitly loaded I05; does not seed or reset.
test("volumen real: PDF completo Firefox", async () => {
  const output = resolve("../artifacts/qa/i05/volume-firefox.pdf");
  mkdirSync(resolve("../artifacts/qa/i05"), { recursive: true });
  rmSync(output, { force: true });
  const browser = await firefox.launch({
    firefoxUserPrefs: {
      "print.always_print_silent": true,
      "print.print_to_file": true,
      print_printer: "Mozilla Save to PDF",
      "print.printer_Mozilla_Save_to_PDF.print_to_file": true,
      "print.printer_Mozilla_Save_to_PDF.print_to_filename": output,
      "print.show_print_progress": false,
    },
  });
  try {
    const page = await browser.newPage({
      baseURL: "http://127.0.0.1:5175",
      locale: "es-AR",
      viewport: { width: 1366, height: 768 },
    });
    await page.addInitScript(() => {
      const nativePrint = window.print.bind(window);
      window.addEventListener("qa-native-print", () => nativePrint());
      window.print = () => {
        document.documentElement.dataset.printed = "yes";
      };
    });
    await page.goto("/");
    await page.getByLabel("Correo electrónico").fill("docente@demo.local");
    await page.getByLabel("Contraseña", { exact: true }).fill(password!);
    await page.getByRole("button", { name: "Ingresar", exact: true }).click();
    await expect(page.getByLabel("Fecha de agenda")).toBeVisible();
    await page.goto("/reservas?date=2027-08-23&page=1&size=20");
    await expect(page.locator(".screen-list tbody tr")).toHaveCount(20);
    await page.getByRole("button", { name: "Imprimir listado diario" }).click();
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
    writeFileSync(
      resolve("../artifacts/qa/i05/print-rows-firefox.json"),
      JSON.stringify(rows),
    );
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
    await page.screenshot({
      path: resolve("../artifacts/qa/i05/list-firefox.png"),
      fullPage: true,
    });
  } finally {
    await browser.close();
  }
});
test("volumen real, paginación, impresión completa e indicadores", async ({
  page,
}) => {
  mkdirSync("../artifacts/qa/i05", { recursive: true });
  await page.addInitScript(() => {
    window.print = () => {
      document.documentElement.dataset.printed = "yes";
    };
  });
  await page.goto("/");
  await page.getByLabel("Correo electrónico").fill("bedel@demo.local");
  await page.getByLabel("Contraseña", { exact: true }).fill(password!);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page.getByLabel("Fecha de agenda")).toBeVisible();
  await page.goto("/reservas?date=2027-08-23&page=1&size=20");
  await expect(page.locator(".screen-list tbody tr")).toHaveCount(20);
  await page.getByRole("button", { name: "Imprimir listado diario" }).click();
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
  writeFileSync("../artifacts/qa/i05/print-rows.json", JSON.stringify(rows));
  await page.pdf({
    path: "../artifacts/qa/i05/volume-real.pdf",
    format: "A4",
    landscape: true,
  });
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.screenshot({
    path: "../artifacts/qa/i05/list-real.png",
    fullPage: true,
  });
  await page.goto("/indicadores?date=2027-08-23");
  await expect(
    page.getByText("52 / 320 h habilitadas", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: /Alumnos previstos. Pico 125/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: /Clases simultáneas. Pico 8/ }),
  ).toBeVisible();
  await expect(page.getByText("780", { exact: true })).toBeVisible();
  await page.screenshot({
    path: "../artifacts/qa/i05/indicators-real.png",
    fullPage: true,
  });
  await page.goto("/indicadores?mode=week&from=2027-08-23&to=2027-08-27");
  await expect(page.getByText("855", { exact: true })).toBeVisible();
  await expect(
    page.getByText("56 / 1.600 h habilitadas", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: /Lunes 09:00–09:30: 120 alumnos previstos/,
    }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "../artifacts/qa/i05/week-real-mobile.png",
    fullPage: true,
  });
});
test("volumen real: filtros y proyección pública Docente", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Correo electrónico").fill("docente@demo.local");
  await page.getByLabel("Contraseña", { exact: true }).fill(password!);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page.getByLabel("Fecha de agenda")).toBeVisible();
  const cases = [
    {
      date: "2027-08-23",
      type: "General",
      room: "",
      status: "active",
      expected: 65,
    },
    {
      date: "2027-08-23",
      type: "Multimedios",
      room: "",
      status: "active",
      expected: 39,
    },
    {
      date: "2027-08-23",
      type: "",
      room: "104",
      status: "active",
      expected: 13,
    },
    { date: "2027-08-24", type: "", room: "", status: "all", expected: 2 },
    {
      date: "2027-08-24",
      type: "",
      room: "",
      status: "cancelled",
      expected: 1,
    },
    { date: "2027-08-25", type: "", room: "", status: "all", expected: 0 },
  ];
  for (const { expected, ...criteria } of cases) {
    const result = await page.evaluate(async (params) => {
      const token = JSON.parse(
        localStorage.getItem("aulas-auth")!,
      ).access_token;
      const r = await fetch(
        "/api/consultas/impresion-diaria?" + new URLSearchParams(params),
        { headers: { Authorization: "Bearer " + token } },
      );
      return { status: r.status, body: await r.json() };
    }, criteria);
    expect(result.status).toBe(200);
    expect(result.body.total).toBe(expected);
    expect(result.body.rows).toHaveLength(expected);
    expect(JSON.stringify(result.body)).not.toMatch(
      /teacherEmail|registrant|changes|@/,
    );
  }
});
