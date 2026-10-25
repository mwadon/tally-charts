import { defineConfig, devices } from '@playwright/test'
import { PREVIEW_SECRET } from './e2e/preview-secret'

export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://127.0.0.1:3100', reducedMotion: 'reduce' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Serves an existing build; run `pnpm build` and `pnpm --filter docs build` first.
  webServer: {
    command: 'pnpm start',
    url: 'http://127.0.0.1:3100',
    // A constant for the tests, not a secret: without one /preview is unreachable (always 401).
    env: { PREVIEW_SECRET },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
