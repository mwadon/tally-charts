import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  // Baselines are per platform. Generate them with `pnpm test:e2e -- --update-snapshots`
  // (darwin locally; linux via CI or the Playwright Docker image) and commit them.
  snapshotPathTemplate: '{testDir}/__screenshots__/{platform}/{arg}{ext}',
  // Locally, new stories get a baseline on first run; CI must fail on a missing one instead.
  updateSnapshots: process.env.CI ? 'none' : 'missing',
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.002, animations: 'disabled' } },
  use: { baseURL: 'http://127.0.0.1:6007' },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 800, height: 600 },
        // The theme turns all motion off under reduced motion, so screenshots never catch a bar
        // mid-way through its entrance animation (the slower linux container did).
        reducedMotion: 'reduce',
      },
    },
  ],
  webServer: {
    command: 'pnpm run build && pnpm exec http-server storybook-static -p 6007 -s',
    url: 'http://127.0.0.1:6007',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
