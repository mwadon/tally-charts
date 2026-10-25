import { expect, test } from '@playwright/test'
import { revealCharts } from './support'

// The viewports of docs/superpowers/specs/assets/docs-site/shots.mjs.
const VIEWPORTS = { 1280: { width: 1280, height: 1400 }, 375: { width: 375, height: 812 } }

for (const [width, viewport] of Object.entries(VIEWPORTS)) {
  for (const theme of ['light', 'dark'] as const) {
    test.describe(`home, ${width} px, ${theme}`, () => {
      // Fixed locale, time zone and scale: the dashboards print dates and numbers.
      test.use({
        viewport,
        colorScheme: theme,
        deviceScaleFactor: 1,
        timezoneId: 'UTC',
        locale: 'en-US',
      })

      test('matches the baseline', async ({ page }) => {
        await page.goto(`/?theme=${theme}`)
        // The charts below the fold mount on scroll, so visit every card before the screenshot.
        await revealCharts(page)
        const tiles = page.locator('.gallery-tile')
        await expect(tiles).toHaveCount(9)
        for (let i = 0; i < 9; i++) {
          await tiles.nth(i).scrollIntoViewIfNeeded()
          await expect(tiles.nth(i).getByRole('application').first()).toBeVisible()
        }
        await page.evaluate(() => window.scrollTo(0, 0))
        await expect(
          page.getByRole('application', { name: 'Margin by week, last 6 weeks' }).first(),
        ).toBeVisible()
        await page.evaluate(() => document.fonts.ready)
        await expect(page).toHaveScreenshot(`home-${width}-${theme}.png`, { fullPage: true })
      })
    })
  }
}
