import { defineConfig } from '@playwright/test'
export default defineConfig({ testDir: './e2e', use: { locale: 'es-AR', baseURL: 'http://127.0.0.1:5173', viewport: { width: 1536, height: 1024 } }, webServer: { command: 'npm run dev', url: 'http://127.0.0.1:5173', reuseExistingServer: true }, reporter: 'list' })
