import { defineConfig } from "@playwright/test";

const origin = process.env.AULAS_TEST_ORIGIN;
if (!origin)
  throw new Error(
    "Definí AULAS_TEST_ORIGIN para ejecutar consultas reales de solo lectura.",
  );

export default defineConfig({
  testDir: "./e2e",
  testMatch: [
    "bundle-real.spec.ts",
    "indicators-real.spec.ts",
    "volume-real.spec.ts",
  ],
  workers: 1,
  timeout: 120000,
  expect: { timeout: 30000 },
  use: {
    baseURL: origin,
    browserName: "chromium",
    locale: "es-AR",
    viewport: { width: 1366, height: 768 },
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  reporter: "list",
});
