import { expect, test } from '@playwright/test'

// The first bar of an animated chart: the library gives it `ch-grow-y` unless the user asks for less motion.
const BAR = '[data-ch-root][data-ch-animate="true"] [data-ch-part="bar"]'

async function animationName(page: import('@playwright/test').Page) {
  await page.goto('/docs/bar-chart')
  const bar = page.locator(BAR).first()
  await expect(bar).toBeAttached()
  // Read right away: animation-name stays set after the animation ends (fill-mode both).
  return bar.evaluate((el) => getComputedStyle(el).animationName)
}

test.describe('prefers-reduced-motion: reduce', () => {
  test.use({ reducedMotion: 'reduce' })

  test('the bars of a chart are not animated', async ({ page }) => {
    expect(await animationName(page)).toBe('none')
  })
})

test.describe('prefers-reduced-motion: no-preference', () => {
  test.use({ reducedMotion: 'no-preference' })

  test('the bars of a chart are animated', async ({ page }) => {
    expect(await animationName(page)).not.toBe('none')
  })
})
