import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: {
    host: "127.0.0.1",
    proxy: {
      "/api":
        loadEnv(mode, process.cwd(), "").AULAS_API_TARGET ||
        "http://127.0.0.1:8080",
    },
  },
}));
