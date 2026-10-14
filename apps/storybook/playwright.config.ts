import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  // Baselines are per platform. Generate them with `pnpm test:e2e -- --update-snapshots`
  // (darwin locally; linux via CI or the Playwright Docker image) and commit them.
  snapshotPathTemplate: '{testDir}/__screenshots__/{platform}/{arg}{ext}',
  updateSnapshots: 'missing',
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.002, animations: 'disabled' } },
  use: { baseURL: 'http://127.0.0.1:6007' },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 800, height: 600 } },
    },
  ],
  webServer: {
    command: 'pnpm run build && pnpm exec http-server storybook-static -p 6007 -s',
    url: 'http://127.0.0.1:6007',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
