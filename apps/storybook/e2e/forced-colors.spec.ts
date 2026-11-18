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
  ['reference-result--light', 'range-gap'],
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

    test(`a custom color gives way to system colors (${colorScheme})`, async ({ page }) => {
      await openForced(page, 'primitives-small-pieces--colors', colorScheme)
      const root = page.locator('#storybook-root')
      // Segments and swatches are HTML with forced-color-adjust: none, so the fallback is theirs.
      const html = await root.locator('[data-ch-colored="true"]:not(rect)').evaluateAll((els) =>
        els.map((el) => {
          const style = getComputedStyle(el)
          return { color: style.backgroundColor, image: style.backgroundImage }
        }),
      )
      // A hatch is a gradient over a transparent color; its stripes use the same variable.
      const solid = html.filter(({ image }) => image === 'none').map(({ color }) => color)
      expect(solid.length).toBeGreaterThan(0)
      const bars = await root
        .locator('rect[data-ch-part="bar"][data-ch-colored="true"]')
        .evaluateAll((els) => els.map((el) => getComputedStyle(el).fill))
      expect(bars.length).toBe(4)
      const allowed = new Set([
        await systemColor(page, 'Highlight'),
        await systemColor(page, 'GrayText'),
        await systemColor(page, 'CanvasText'),
      ])
      expect([...solid, ...bars].filter((color) => !allowed.has(color))).toEqual([])
    })

    test(`grouped bars stay visible and apart (${colorScheme})`, async ({ page }) => {
      await openForced(page, 'charts-groupedbarchart--light', colorScheme)
      const canvas = await systemColor(page, 'Canvas')
      const bars = await page
        .locator('#storybook-root rect[data-ch-part="bar"]')
        .evaluateAll((els) =>
          els.map((el) => {
            const style = getComputedStyle(el)
            const box = el.getBoundingClientRect()
            return {
              fill: style.fill,
              stroke: style.stroke,
              hatched: el.getAttribute('data-ch-fill') !== 'solid',
              left: box.left,
              right: box.right,
            }
          }),
        )
      // 4 quarters × 3 crews, drawn one crew after another.
      expect(bars).toHaveLength(12)
      for (const bar of bars) {
        if (bar.hatched) {
          // A hatch is a pattern; its tone outline keeps the bar's edge.
          expect(bar.stroke).not.toBe('none')
          continue
        }
        expect(bar.fill).not.toBe(canvas)
        expect(bar.fill).not.toBe('none')
        expect(bar.fill).not.toMatch(/rgba\(.*, 0\)$/)
      }
      // Tones collapse onto a few system colors, so the gap is what keeps a group's bars apart.
      for (let row = 0; row < 4; row++) {
        const group = [0, 1, 2].map((s) => bars[s * 4 + row] as (typeof bars)[number])
        for (let k = 1; k < group.length; k++) {
          const prev = group[k - 1] as (typeof bars)[number]
          const next = group[k] as (typeof bars)[number]
          expect(next.left - prev.right).toBeGreaterThanOrEqual(3)
        }
      }
    })

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

    test(`runway cells keep a visible edge (${colorScheme})`, async ({ page }) => {
      await openForced(page, 'charts-runwaychart--states-light', colorScheme)
      const strokes = await page
        .locator('#storybook-root [data-ch-part="runway-cell"]')
        .evaluateAll((els) => els.map((el) => getComputedStyle(el).stroke))
      expect(strokes.length).toBeGreaterThan(0)
      for (const stroke of strokes) expect(stroke).not.toBe('none')
    })

    test(`a keyboard-focused runway row gets a Highlight ring (${colorScheme})`, async ({
      page,
    }) => {
      await openForced(page, 'charts-runwaychart--states-light', colorScheme)
      const rows = page.locator('#storybook-root [data-ch-part="runway-row"]')
      await page.keyboard.press('Tab')
      await page.keyboard.press('ArrowDown')
      const ring = await rows.nth(1).evaluate((el) => {
        const style = getComputedStyle(el)
        return { style: style.outlineStyle, color: style.outlineColor }
      })
      expect(ring).toEqual({ style: 'solid', color: await systemColor(page, 'Highlight') })
      // The selected row, not focused, keeps its dashed outline.
      expect(await rows.nth(0).evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('dashed')
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
