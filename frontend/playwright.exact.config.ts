import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  testMatch: "*-exact.spec.ts",
  workers: 1,
  timeout: 120000,
  expect: { timeout: 15000 },
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
