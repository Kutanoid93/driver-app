import path from 'node:path'
import { config as loadEnv } from 'dotenv'
import { defineConfig, devices } from '@playwright/test'

// .env holds real Supabase project config (shared with the app itself),
// .env.test holds the throwaway test-driver credentials - both are needed
// for tests to log in through the UI and to clean up via Supabase directly.
loadEnv({ path: path.resolve(import.meta.dirname, '.env') })
loadEnv({ path: path.resolve(import.meta.dirname, '.env.test') })

const PORT = 5173
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
