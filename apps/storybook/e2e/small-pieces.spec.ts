import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { open } from './stories'

// Not in STORIES: no screenshot, so this story needs no baseline. The checks are measurements.
const EDGE_CASES = 'primitives-small-pieces--edge-cases'

test('a 0.1% ShareBar segment keeps 2px and the segments and gaps fill the bar', async ({
  page,
}) => {
  await open(page, EDGE_CASES)
  const bar = page.getByTestId('rare-share').locator('[data-ch-part="share-bar"]')
  const { width, gap, segments } = await bar.evaluate((el) => ({
    width: el.getBoundingClientRect().width,
    gap: Number.parseFloat(getComputedStyle(el).columnGap) || 0,
    segments: [...el.querySelectorAll('[data-ch-part="share-segment"]')].map(
      (s) => s.getBoundingClientRect().width,
    ),
  }))
  expect(segments).toHaveLength(2)
  for (const w of segments) expect(w).toBeGreaterThanOrEqual(2)
  const sum = segments.reduce((a, b) => a + b, 0) + (segments.length - 1) * gap
  expect(Math.abs(sum - width)).toBeLessThanOrEqual(0.5)
})

test('a 0.1% ZoneMeter zone keeps 2px of fill and the zones fill the track', async ({ page }) => {
  await open(page, EDGE_CASES)
  const track = page.getByTestId('rare-zone').locator('[data-ch-part="zone-meter-track"]')
  const { width, zones } = await track.evaluate((el) => ({
    width: el.getBoundingClientRect().width,
    zones: [...el.querySelectorAll('[data-ch-part="zone-meter-zone"]')].map((z) => ({
      fill: z.clientWidth,
      box: z.getBoundingClientRect().width,
    })),
  }))
  expect(zones).toHaveLength(3)
  for (const z of zones) expect(z.fill).toBeGreaterThanOrEqual(2)
  const sum = zones.reduce((a, z) => a + z.box, 0)
  expect(Math.abs(sum - width)).toBeLessThanOrEqual(0.5)
})

test('no ZoneMeter label leaves its meter', async ({ page }) => {
  await open(page, EDGE_CASES)
  const overflow = await page.evaluate(() => {
    const out: string[] = []
    const labels = document.querySelectorAll('[data-ch-part="zone-meter-label"]')
    for (const label of labels) {
      const box = label.closest('[data-ch-part="zone-meter"]')?.getBoundingClientRect()
      const rect = label.getBoundingClientRect()
      if (!box || rect.left < box.left - 0.5 || rect.right > box.right + 0.5) {
        out.push(label.textContent ?? '')
      }
    }
    return { out, count: labels.length }
  })
  expect(overflow.count).toBeGreaterThan(0)
  expect(overflow.out).toEqual([])
})

test('the edge cases story has no axe violations', async ({ page }) => {
  await open(page, EDGE_CASES)
  const results = await new AxeBuilder({ page })
    .include('#storybook-root')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze()
  expect(results.violations).toEqual([])
})
