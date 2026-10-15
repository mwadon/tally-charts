import { expect, type Page, test } from '@playwright/test'

// Windows high contrast, emulated in Chromium (spec §5): marks and focus indicators stay visible.
async function openForced(page: Page, id: string, colorScheme: 'light' | 'dark') {
  await page.emulateMedia({ forcedColors: 'active', colorScheme })
  await page.goto(`/iframe.html?id=${id}&viewMode=story`)
  await page
    .locator('#storybook-root [data-ch-root], #storybook-root [data-ch-part]')
    .first()
    .waitFor()
}

/** A system color as the page computes it, e.g. `rgb(255, 255, 255)` for Canvas. */
function systemColor(page: Page, name: string) {
  return page.evaluate((color) => {
    const probe = document.createElement('span')
    probe.style.color = color
    document.body.append(probe)
    const value = getComputedStyle(probe).color
    probe.remove()
    return value
  }, name)
}

const MARKS = [
  ['primitives-legend--default', 'legend-swatch'],
  ['reference-gross-margin--light', 'meter-fill'],
  ['primitives-small-pieces--default', 'inline-bar-fill'],
  ['primitives-small-pieces--default', 'dot-count-dot'],
  ['reference-result--light', 'range-dot'],
] as const

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`forced colors, ${colorScheme} scheme`, () => {
    for (const [id, part] of MARKS) {
      test(`${part} in ${id} keeps a visible fill`, async ({ page }) => {
        await openForced(page, id, colorScheme)
        const canvas = await systemColor(page, 'Canvas')
        const fills = await page
          .locator(`#storybook-root [data-ch-part="${part}"]`)
          .evaluateAll((els) =>
            els.map((el) => {
              const style = getComputedStyle(el)
              return { color: style.backgroundColor, image: style.backgroundImage }
            }),
          )
        expect(fills.length).toBeGreaterThan(0)
        for (const { color, image } of fills) {
          // A hatch is a gradient image over a transparent color; a solid fill is a color.
          if (image !== 'none') continue
          expect(color).not.toBe(canvas)
          expect(color).not.toMatch(/rgba\(.*, 0\)$/)
        }
      })
    }

    test('heatmap levels differ by border width and keep a focus ring', async ({ page }) => {
      await openForced(page, 'reference-where-it-leaks--light', colorScheme)
      const borders = await page
        .locator('#storybook-root [data-ch-part="heatmap-cell"]')
        .evaluateAll((els) =>
          els.map((el) => [el.getAttribute('data-ch-level'), getComputedStyle(el).borderTopWidth]),
        )
      for (const [level, width] of borders) expect(width).toBe(`${Number(level) || 1}px`)
      await page.getByRole('gridcell', { name: '$14.8K' }).focus()
      const ring = await page.evaluate(() => {
        const style = getComputedStyle(document.activeElement as Element)
        return { style: style.outlineStyle, width: style.outlineWidth, color: style.outlineColor }
      })
      expect(ring.style).toBe('solid')
      expect(ring.width).toBe('2px')
      expect(ring.color).toBe(await systemColor(page, 'Highlight'))
    })

    test('chart text follows the system text color and the widget keeps its ring', async ({
      page,
    }) => {
      await openForced(page, 'reference-estimate-vs-actual--light', colorScheme)
      const text = await systemColor(page, 'CanvasText')
      const fill = await page
        .locator('#storybook-root [data-ch-part="row-label"]')
        .first()
        .evaluate((el) => getComputedStyle(el).fill)
      expect(fill).toBe(text)
      await page.keyboard.press('Tab')
      const ring = await page
        .getByRole('application')
        .evaluate((el) => getComputedStyle(el).outlineStyle)
      expect(ring).toBe('solid')
    })
  })
}
