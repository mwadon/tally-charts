import { expect, test } from '@playwright/test'
import { open, VIEWPORTS } from './stories'

// Also in STORIES (320px screenshot); these checks measure what a screenshot cannot.
const EDGE_CASES = 'primitives-small-pieces--edge-cases'

// The default 800px viewport gives a 320px card; the 320px viewport of the baseline gives 256px.
const SIZES = [
  { name: '800px viewport', size: undefined },
  { name: '320px viewport', size: VIEWPORTS[EDGE_CASES] },
]

for (const { name, size } of SIZES) {
  test.describe(name, () => {
    test.beforeEach(async ({ page }) => {
      if (size) await page.setViewportSize(size)
      await open(page, EDGE_CASES)
    })

    test('a 0.1% ShareBar segment keeps 2px and the segments and gaps fill the bar', async ({
      page,
    }) => {
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

    test('a 0.1% ZoneMeter zone keeps 2px of fill and the zones fill the track', async ({
      page,
    }) => {
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

    test('long end labels do not overlap the tick between them', async ({ page }) => {
      const rects = await page
        .getByTestId('long-labels')
        .locator('[data-ch-part="zone-meter-label"]')
        .evaluateAll((els) =>
          els.map((el) => {
            const r = el.getBoundingClientRect()
            return { left: r.left, right: r.right }
          }),
        )
      expect(rects).toHaveLength(3)
      for (let i = 1; i < rects.length; i++) {
        expect(rects[i]?.left).toBeGreaterThanOrEqual((rects[i - 1]?.right ?? 0) - 0.5)
      }
    })
  })
}
