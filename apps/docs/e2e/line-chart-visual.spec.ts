import { expect, test } from '@playwright/test'
import { revealCharts } from './support'

// Titles of the two chart examples on content/line-chart.json.
const CHARTS = [
  'Monthly revenue, actual and forecast',
  'Weekly orders this autumn, over the same weeks last year',
]

for (const theme of ['light', 'dark'] as const) {
  test.describe(`line-chart page, 1280 px, ${theme}`, () => {
    // Fixed locale, time zone and scale: the charts print dates and numbers.
    test.use({
      viewport: { width: 1280, height: 1400 },
      colorScheme: theme,
      deviceScaleFactor: 1,
      timezoneId: 'UTC',
      locale: 'en-US',
    })

    test('matches the baseline', async ({ page }) => {
      await page.goto(`/docs/line-chart?theme=${theme}`)
      // The charts mount on scroll, so visit every card before the screenshot.
      await revealCharts(page)
      const cards = page.locator('.chart-example')
      await expect(cards).toHaveCount(2)
      for (let i = 0; i < 2; i++) {
        await cards.nth(i).scrollIntoViewIfNeeded()
        await expect(cards.nth(i).getByRole('application').first()).toBeVisible()
      }
      for (const name of CHARTS) {
        await expect(page.getByRole('application', { name }).first()).toBeVisible()
      }
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.evaluate(() => document.fonts.ready)
      await expect(page).toHaveScreenshot(`line-chart-1280-${theme}.png`, { fullPage: true })
    })
  })
}
