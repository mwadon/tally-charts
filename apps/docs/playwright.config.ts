import { defineConfig, devices } from '@playwright/test'
import { PREVIEW_SECRET } from './e2e/preview-secret'

export default defineConfig({
  testDir: './e2e',
  // Baselines are per platform. Regenerate them with
  // `pnpm --filter docs exec playwright test --update-snapshots=all` (darwin, after
  // `pnpm build && pnpm --filter docs build`; linux via the docker command above the `docs` job in
  // .github/workflows/ci.yml) and commit them.
  snapshotPathTemplate: '{testDir}/__screenshots__/{platform}/{arg}{ext}',
  // Locally, a new screenshot gets a baseline on first run; CI must fail on a missing one instead.
  updateSnapshots: process.env.CI ? 'none' : 'missing',
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.002, animations: 'disabled' } },
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
