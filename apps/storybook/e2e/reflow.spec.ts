import { expect, test } from '@playwright/test'
import { open, STORIES } from './stories'

// WCAG 1.4.10 at 320 CSS px (spec §7): no story scrolls the page sideways, and no labels overlap
// or get clipped. The heatmap may scroll inside its own container.
test.use({ viewport: { width: 320, height: 640 } })

for (const id of [...STORIES, 'reference-last-12-weeks--selectable']) {
  test(`${id} reflows at 320px`, async ({ page }) => {
    await open(page, id)
    const result = await page.evaluate(() => {
      const width = document.documentElement.clientWidth
      const root = document.querySelector('#storybook-root') as Element
      const texts = [...root.querySelectorAll<SVGTextElement>('svg text')]
        .map((el) => ({ el, box: el.getBoundingClientRect(), text: el.textContent?.trim() ?? '' }))
        .filter((t) => t.box.width > 0 && t.text)
      const overlaps: string[] = []
      for (let i = 0; i < texts.length; i++) {
        for (let j = i + 1; j < texts.length; j++) {
          const a = texts[i]
          const b = texts[j]
          if (!a || !b || a.el.ownerSVGElement !== b.el.ownerSVGElement) continue
          const w = Math.min(a.box.right, b.box.right) - Math.max(a.box.left, b.box.left)
          const h = Math.min(a.box.bottom, b.box.bottom) - Math.max(a.box.top, b.box.top)
          if (w > 1 && h > 1) overlaps.push(`"${a.text}" × "${b.text}"`)
        }
      }
      const offscreen = texts
        .filter((t) => t.box.left < -1 || t.box.right > width + 1)
        .map((t) => t.text)
      const clipped = [
        ...root.querySelectorAll(
          '[data-ch-part="heatmap-cell"], [data-ch-part="heatmap-header"], [data-ch-part="heatmap-rowheader"], [data-ch-part="heatmap-total"], [data-ch-part="legend-label"], [data-ch-part="tooltip-pill"]',
        ),
      ]
        .filter((el) => el.scrollWidth > el.clientWidth + 1)
        .map((el) => el.textContent?.trim())
      return {
        scrollWidth: document.documentElement.scrollWidth,
        width,
        overlaps,
        offscreen,
        clipped,
      }
    })
    expect(result.scrollWidth, 'page scrolls sideways').toBeLessThanOrEqual(result.width)
    expect(result.overlaps).toEqual([])
    expect(result.offscreen).toEqual([])
    expect(result.clipped).toEqual([])
  })
}
