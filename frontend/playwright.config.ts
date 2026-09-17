import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  testIgnore: ["**/prototype/**", "**/*-real.spec.ts"],
  use: {
    locale: "es-AR",
    baseURL: "http://127.0.0.1:5174",
    viewport: { width: 1440, height: 1000 },
  },
  webServer: {
    command: "npm run dev -- --port 5174 --strictPort",
    url: "http://127.0.0.1:5174",
    reuseExistingServer: false,
    env: {
      VITE_SUPABASE_URL: "https://aulas-test.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "test-public-key",
    },
  },
  reporter: "list",
});
