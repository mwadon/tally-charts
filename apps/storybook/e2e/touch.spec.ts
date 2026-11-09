import { expect, test } from '@playwright/test'
import { open } from './stories'

// Chromium's touch emulation: a tap sends pointerdown, pointerup and pointerleave, and only then
// the focus and the click. No pointermove comes first.
test.use({ hasTouch: true })

const tooltip = '[data-ch-part="tooltip"]'

test('a touch tap on a bar activates that bar, not the first one', async ({ page }) => {
  await open(page, 'reference-last-12-weeks--light')
  const box = await page.locator('[data-ch-part="bar-hit"]').nth(3).boundingBox()
  if (!box) throw new Error('no bar to tap')
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)
  await expect(page.locator('[data-ch-root]').getByRole('application')).toBeFocused()
  await expect(page.locator(tooltip)).toContainText('Jul 27')
  await expect(page.locator('[data-ch-part="bar"][data-ch-dimmed="true"]')).toHaveCount(11)
  // The tap is not keyboard focus: nothing is announced.
  await expect(page.locator('[data-ch-root] [aria-live]')).toHaveText('')
  // A tap outside the chart takes the focus and the tapped point with it.
  await page.touchscreen.tap(790, 590)
  await expect(page.locator(tooltip)).toHaveCount(0)
})

test('a touch tap on a line chart activates the nearest point', async ({ page }) => {
  await open(page, 'charts-linechart--underlay-light')
  const box = await page.locator('[data-ch-part="pointer-layer"]').boundingBox()
  if (!box) throw new Error('no pointer layer to tap')
  const y = box.y + box.height / 2
  await page.touchscreen.tap(box.x + box.width * 0.9, y)
  await expect(page.locator(tooltip)).toHaveCount(1)
  const late = await page.locator(tooltip).textContent()
  // A second tap, on an already focused chart, moves to the point under it.
  await page.touchscreen.tap(box.x + box.width * 0.1, y)
  await expect(page.locator(tooltip)).toHaveCount(1)
  await expect(page.locator(tooltip)).not.toHaveText(late ?? '')
  await expect(page.locator('[data-ch-root] [aria-live]')).toHaveText('')
})
