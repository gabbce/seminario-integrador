import { existsSync, readFileSync, rmSync } from "node:fs";
import { test, expect, firefox } from "@playwright/test";
import { fakeAuth, login } from "./auth-fixture";
const rows = Array.from({ length: 121 }, (_, i) => ({
  id: String(i + 1),
  bookingId: "80",
  courseId: "8",
  course: "001-A-2027",
  subject: `Clase impresa ${i + 1}`,
  teacher: "Laura Gómez",
  students: 30,
  date: "2027-03-01",
  start: "14:00",
  end: "15:00",
  room: "101",
  type: "General",
  cancelled: i === 120,
}));
for (const browserName of ["chromium", "firefox"])
  test(`impresión completa, filtro, error y PDF ${browserName}`, async ({
    page: chromiumPage,
  }) => {
    test.setTimeout(60000);
    const browser =
      browserName === "firefox"
        ? await firefox.launch({
            firefoxUserPrefs: {
              "print.always_print_silent": true,
              "print.print_to_file": true,
              print_printer: "Mozilla Save to PDF",
              "print.printer_Mozilla_Save_to_PDF.print_to_file": true,
              "print.printer_Mozilla_Save_to_PDF.print_to_filename":
                "/tmp/i052-firefox-complete.pdf",
              "print.show_print_progress": false,
            },
          })
        : undefined;
    const page = browser
      ? await browser.newPage({
          baseURL: "http://127.0.0.1:5174",
          viewport: { width: 1366, height: 768 },
        })
      : chromiumPage;
    try {
      await fakeAuth(page);
      let fail = false;
      await page.addInitScript(() => {
        const nativePrint = window.print.bind(window);
        window.addEventListener("qa-native-print", () => nativePrint());
        window.print = () => {
          document.documentElement.dataset.prints = String(
            Number(document.documentElement.dataset.prints || 0) + 1,
          );
        };
      });
      await page.route("**/api/consultas/listado?*", (r) =>
        r.fulfill({
          json: {
            rows: rows.slice(20, 40),
            total: 121,
            page: 1,
            size: 20,
            filters: {},
          },
        }),
      );
      await page.route("**/api/consultas/impresion-diaria?*", (r) => {
        if (fail)
          return r.fulfill({
            status: 503,
            json: { message: "No se pudo obtener el conjunto completo" },
          });
        const p = new URL(r.request().url()).searchParams;
        const selected =
          p.get("date") === "2027-03-02"
            ? []
            : p.get("status") === "cancelled"
              ? rows.slice(120)
              : rows;
        return r.fulfill({
          json: {
            rows: selected,
            total: selected.length,
            page: 0,
            size: 0,
            filters: {},
          },
        });
      });
      await page.goto("/");
      await login(page, "docente");
      await expect(page.getByLabel("Fecha de agenda")).toBeVisible();
      await page.goto("/reservas?date=2027-03-01&status=all&page=1");
      await expect(page.locator(".listing-table tbody tr")).toHaveCount(20);
      await page
        .getByRole("button", { name: "Imprimir listado diario" })
        .click();
      await expect(page.locator("html")).toHaveAttribute("data-prints", "1");
      await expect(page.locator(".print-list tbody tr")).toHaveCount(121);
      expect(
        await page
          .locator(".print-list tbody tr")
          .evaluateAll((nodes) =>
            nodes.map((n) => n.getAttribute("data-occurrence-id")),
          ),
      ).toEqual(rows.map((r) => r.id));
      await page.emulateMedia({ media: "print" });
      await expect(page.locator(".screen-list")).toBeHidden();
      await expect(page.locator(".print-list")).toBeVisible();
      await expect(page.locator(".print-list button")).toHaveCount(0);
      await page.screenshot({
        path: `/tmp/i052-print-${browserName}.png`,
        fullPage: true,
      });
      if (browserName === "chromium")
        await page.pdf({
          path: "/tmp/i052-complete.pdf",
          preferCSSPageSize: true,
          printBackground: true,
        });
      if (browserName === "firefox") {
        rmSync("/tmp/i052-firefox-complete.pdf", { force: true });
        await page.evaluate(() =>
          window.dispatchEvent(new Event("qa-native-print")),
        );
        await expect
          .poll(
            () =>
              existsSync("/tmp/i052-firefox-complete.pdf") &&
              readFileSync("/tmp/i052-firefox-complete.pdf")
                .subarray(-30)
                .toString()
                .includes("%%EOF"),
            { timeout: 30000 },
          )
          .toBe(true);
      }
      await page.emulateMedia({ media: "screen" });
      await page.getByLabel("Estado del listado").selectOption("cancelled");
      await expect(page.locator(".print-list tbody tr")).toHaveCount(0);
      fail = true;
      await page
        .getByRole("button", { name: "Imprimir listado diario" })
        .click();
      await expect(page.getByRole("alert")).toContainText("conjunto completo");
      await expect(page.locator("html")).toHaveAttribute("data-prints", "1");
      fail = false;
      await page
        .getByRole("button", { name: "Imprimir listado diario" })
        .click();
      await expect(page.locator(".print-list tbody tr")).toHaveCount(1);
      await page.getByLabel("Fecha del listado").fill("2027-03-02");
      await page
        .getByRole("button", { name: "Imprimir listado diario" })
        .click();
      await expect(page.locator("html")).toHaveAttribute("data-prints", "3");
      await expect(page.locator(".print-list")).toContainText("0 resultados");
    } finally {
      await browser?.close();
    }
  });

test("no imprime respuesta incompleta ni filtros que cambiaron durante carga", async ({
  page,
}) => {
  await fakeAuth(page);
  await page.addInitScript(() => {
    window.print = () => {
      document.documentElement.dataset.printed = "yes";
    };
  });
  let partial = true;
  await page.route("**/api/consultas/impresion-diaria?*", async (r) => {
    if (!partial) await new Promise((resolve) => setTimeout(resolve, 400));
    await r.fulfill({
      json: {
        rows: partial ? rows.slice(0, 20) : rows,
        total: 121,
        page: 0,
        size: 0,
        filters: {},
      },
    });
  });
  await page.goto("/");
  await login(page);
  await expect(page.getByLabel("Fecha de agenda")).toBeVisible();
  await page.getByRole("link", { name: "Reservas", exact: true }).click();
  await page.getByRole("button", { name: "Imprimir listado diario" }).click();
  await expect(page.getByRole("alert")).toContainText("incompleto");
  partial = false;
  await page.getByRole("button", { name: "Imprimir listado diario" }).click();
  await page.getByLabel("Estado del listado").selectOption("cancelled");
  await page.waitForTimeout(600);
  await expect(page.locator("html")).not.toHaveAttribute("data-printed", "yes");
  await expect(page.locator(".print-list tbody tr")).toHaveCount(0);
});
