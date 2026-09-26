import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  testMatch: "bundle-real.spec.ts",
  workers: 1,
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
