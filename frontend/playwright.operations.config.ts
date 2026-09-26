import { defineConfig } from "@playwright/test";
const browser = process.env.AULAS_QA_BROWSER || "chromium";
if (browser !== "chromium" && browser !== "firefox")
  throw Error("AULAS_QA_BROWSER debe ser chromium o firefox");
export default defineConfig({
  testDir: "./e2e",
  testMatch: [
    "sporadic-real.spec.ts",
    "cancellation-real.spec.ts",
    "header-real.spec.ts",
    "room-change-real.spec.ts",
    "reschedule-real.spec.ts",
    "calendar-impact-real.spec.ts",
  ],
  globalSetup: "./e2e/operations-package-setup.ts",
  workers: 1,
  timeout: 180000,
  expect: { timeout: 30000 },
  projects: [{ name: browser, use: { browserName: browser } }],
  use: {
    baseURL: "http://127.0.0.1:5176",
    locale: "es-AR",
    viewport: { width: 1366, height: 768 },
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  reporter: "list",
});
