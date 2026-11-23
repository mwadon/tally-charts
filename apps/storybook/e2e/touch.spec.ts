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

test('a touch tap on a funnel step activates that step', async ({ page }) => {
  await open(page, 'charts-funnelchart--vertical')
  const box = await page.locator('[data-ch-part="funnel-hit"]').nth(2).boundingBox()
  if (!box) throw new Error('no funnel step to tap')
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)
  await expect(page.locator(tooltip)).toContainText('of first step')
  await expect(page.locator('[data-ch-part="funnel-guide"][data-ch-active="true"]')).toHaveCount(1)
  await expect(page.locator('[data-ch-root] [aria-live]')).toHaveText('')
})

test('a touch tap on a donut slice activates that slice', async ({ page }) => {
  await open(page, 'charts-donutchart--light')
  const ring = await page.locator('[data-ch-part="donut-ring"]').boundingBox()
  if (!ring) throw new Error('no ring to tap')
  // Mid-ring at 9 o'clock: inside Repairs, which runs from 66% to 82% of the ring.
  const r = (ring.width / 2) * 0.82
  await page.touchscreen.tap(ring.x + ring.width / 2 - r, ring.y + ring.height / 2)
  await expect(page.locator(tooltip)).toContainText('Repairs')
  await expect(page.locator('[data-ch-part="donut-slice"][data-ch-dimmed="true"]')).toHaveCount(4)
  await expect(page.locator('[data-ch-part="donut-slice"]').nth(2)).not.toHaveAttribute(
    'data-ch-dimmed',
    'true',
  )
  await expect(page.locator('[data-ch-root] [aria-live]')).toHaveText('')
})

test('a touch tap on a gantt row activates that row', async ({ page }) => {
  await open(page, 'charts-ganttchart--light')
  // The third row, Haul-away: tap its hit rect in the plot, right of the names.
  const box = await page.locator('[data-ch-part="gantt-hit"]').nth(2).boundingBox()
  if (!box) throw new Error('no gantt row to tap')
  await page.touchscreen.tap(box.x + box.width * 0.6, box.y + box.height / 2)
  await expect(page.locator(tooltip)).toContainText('Haul-away')
  const active = page.locator('[data-ch-part="gantt-row"][data-ch-active="true"]')
  await expect(active).toHaveCount(1)
  await expect(active).toContainText('Haul-away')
  await expect(page.locator('[data-ch-part="gantt-bar"][data-ch-dimmed="true"]')).toHaveCount(10)
  await expect(page.locator('[data-ch-root] [aria-live]')).toHaveText('')
})
