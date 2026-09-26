import { resolve } from "node:path";
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  testMatch: "bundle-real.spec.ts",
  workers: 1,
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    {
      name: "firefox",
      use: {
        browserName: "firefox",
        launchOptions: {
          firefoxUserPrefs: {
            "print.always_print_silent": true,
            "print.print_to_file": true,
            print_printer: "Mozilla Save to PDF",
            "print.printer_Mozilla_Save_to_PDF.print_to_file": true,
            "print.printer_Mozilla_Save_to_PDF.print_to_filename": resolve(
              "../artifacts/qa/package/volume-firefox.pdf",
            ),
            "print.show_print_progress": false,
          },
        },
      },
    },
  ],
  timeout: 120000,
  expect: { timeout: 30000 },
  use: {
    baseURL: process.env.AULAS_TEST_ORIGIN || "http://127.0.0.1:8082",
    locale: "es-AR",
    viewport: { width: 1366, height: 768 },
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  reporter: "list",
});
