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

    test(`stacked segments stay visible and apart (${colorScheme})`, async ({ page }) => {
      await openForced(page, 'charts-stackedbarchart--light', colorScheme)
      const canvas = await systemColor(page, 'Canvas')
      const bars = await page
        .locator('#storybook-root rect[data-ch-part="bar"]')
        .evaluateAll((els) =>
          els.map((el) => {
            const style = getComputedStyle(el)
            const box = el.getBoundingClientRect()
            return {
              fill: style.fill,
              centre: Math.round((box.left + box.right) / 2),
              top: box.top,
              bottom: box.bottom,
            }
          }),
        )
      // 6 months × 3 series, plus the over-budget piece of April's and June's top segment.
      expect(bars).toHaveLength(20)
      for (const bar of bars) {
        expect(bar.fill).not.toBe(canvas)
        expect(bar.fill).not.toBe('none')
        expect(bar.fill).not.toMatch(/rgba\(.*, 0\)$/)
      }
      // Tones collapse onto a few system colors, so the gap is what keeps a stack's segments apart.
      const stacks = new Map<number, typeof bars>()
      for (const bar of bars) stacks.set(bar.centre, [...(stacks.get(bar.centre) ?? []), bar])
      expect(stacks.size).toBe(6)
      for (const stack of stacks.values()) {
        const sorted = [...stack].sort((a, b) => b.top - a.top)
        for (let k = 1; k < sorted.length; k++) {
          const below = sorted[k - 1] as (typeof bars)[number]
          const above = sorted[k] as (typeof bars)[number]
          expect(below.top - above.bottom).toBeGreaterThanOrEqual(1.5)
        }
      }
    })

    test(`stacked area layers, hatch, rule and labels stay visible (${colorScheme})`, async ({
      page,
    }) => {
      await openForced(page, 'charts-stackedareachart--light', colorScheme)
      const canvas = await systemColor(page, 'Canvas')
      // Computed colors serialize as rgb(), rgba() or color(srgb ...), so resolve them to RGBA
      // numbers in the page (a 1x1 canvas parses every form) and compare those.
      // Resolved twice with different seeds: a value the canvas ignores keeps the seed, so the
      // two results differ and the value counts as unparseable (null), never as a colour.
      const resolve = (value: string) =>
        page.evaluate((v) => {
          const ctx = document.createElement('canvas').getContext('2d', {
            willReadFrequently: true,
          }) as CanvasRenderingContext2D
          const paint = (seed: string) => {
            ctx.clearRect(0, 0, 1, 1)
            ctx.fillStyle = seed
            ctx.fillStyle = v
            ctx.fillRect(0, 0, 1, 1)
            return [...ctx.getImageData(0, 0, 1, 1).data]
          }
          const first = paint('#010203')
          const second = paint('#fdfcfb')
          return first.every((c, i) => c === second[i]) ? first : null
        }, value)
      const canvasRgba = await resolve(canvas)
      if (!canvasRgba) throw new Error(`Canvas (${canvas}) did not resolve to a color`)
      // Real: not 'none', at least 20% opaque, and after compositing over the Canvas color some
      // channel differs from Canvas by more than 24.
      const isRealColor = async (value: string) => {
        if (value === 'none' || value.startsWith('url(')) return false
        const rgba = await resolve(value)
        if (!rgba) return false
        const [r = 0, g = 0, b = 0, a = 0] = rgba
        if (a < 0.2 * 255) return false
        const over = [r, g, b].map((c, i) => (c * a + (canvasRgba[i] ?? 0) * (255 - a)) / 255)
        return over.some((c, i) => Math.abs(c - (canvasRgba[i] ?? 0)) > 24)
      }
      // The helper can fail: Canvas itself in any serialization, fully transparent, none.
      const [cr = 0, cg = 0, cb = 0] = canvasRgba
      expect(await isRealColor(`color(srgb ${cr / 255} ${cg / 255} ${cb / 255})`)).toBe(false)
      expect(await isRealColor(canvas)).toBe(false)
      expect(await isRealColor('color(srgb 0 0 0 / 0)')).toBe(false)
      expect(await isRealColor('rgb(0 0 0 / 0)')).toBe(false)
      expect(await isRealColor('none')).toBe(false)
      expect(await isRealColor('url(#nope)')).toBe(false)
      expect(await isRealColor('notacolor')).toBe(false)
      expect(await resolve('notacolor')).toBeNull()
      expect(await isRealColor('rgb(255 0 0)')).toBe(true)
      const layers = await page
        .locator('#storybook-root path[data-ch-part="area-layer"]')
        .evaluateAll((els) =>
          els.map((el) => {
            const fill = getComputedStyle(el).fill
            const id = /^url\("?#([^")]+)"?\)$/.exec(fill)?.[1]
            const pattern = id ? document.getElementById(id) : null
            const line = pattern?.querySelector('line')
            const style = line ? getComputedStyle(line) : undefined
            return {
              fill,
              kind: el.getAttribute('data-ch-fill'),
              hatchStroke: style?.stroke,
              hatchWidth: style ? Number.parseFloat(style.strokeWidth) : 0,
            }
          }),
        )
      // Three layers, each a solid part (W1 to W9) and a hatched one (W9 to W12).
      const solid = layers.filter((l) => l.kind === 'solid')
      const hatched = layers.filter((l) => l.kind === 'hatch')
      expect(solid).toHaveLength(3)
      expect(hatched).toHaveLength(3)
      for (const layer of solid) expect(await isRealColor(layer.fill)).toBe(true)
      // A hatched fill is a url(); what keeps it visible is the stripe line inside its pattern.
      for (const layer of hatched) {
        expect(layer.fill).toMatch(/^url\(/)
        expect(layer.hatchStroke).toBeDefined()
        expect(await isRealColor(layer.hatchStroke as string)).toBe(true)
        expect(layer.hatchWidth).toBeGreaterThan(0)
      }
      // Tones collapse onto few system colors, so the separators keep neighbouring layers apart.
      const separators = await page
        .locator('#storybook-root path[data-ch-part="area-separator"]')
        .evaluateAll((els) =>
          els.map((el) => {
            const style = getComputedStyle(el)
            return { stroke: style.stroke, width: Number.parseFloat(style.strokeWidth) }
          }),
        )
      expect(separators.length).toBeGreaterThanOrEqual(2)
      for (const sep of separators) {
        expect(sep.stroke).toBe(canvas)
        expect(sep.width).toBeGreaterThanOrEqual(1.5)
      }
      // The hatched part keeps its upper edge: a real stroke, not the canvas colour.
      const edges = await page
        .locator('#storybook-root path[data-ch-part="area-edge"]')
        .evaluateAll((els) =>
          els.map((el) => {
            const style = getComputedStyle(el)
            return { stroke: style.stroke, width: Number.parseFloat(style.strokeWidth) }
          }),
        )
      expect(edges.length).toBeGreaterThanOrEqual(3)
      for (const edge of edges) {
        expect(await isRealColor(edge.stroke)).toBe(true)
        expect(edge.width).toBeGreaterThanOrEqual(1)
      }
      const rule = await page
        .locator('#storybook-root [data-ch-part="forecast-rule"]')
        .evaluate((el) => ({
          stroke: getComputedStyle(el).stroke,
          box: el.getBoundingClientRect().height,
        }))
      expect(await isRealColor(rule.stroke)).toBe(true)
      expect(rule.box).toBeGreaterThan(50)
      for (const part of ['forecast-label', 'end-label', 'end-value']) {
        const fills = await page
          .locator(`#storybook-root [data-ch-part="${part}"]`)
          .evaluateAll((els) => els.map((el) => getComputedStyle(el).fill))
        expect(fills.length).toBeGreaterThan(0)
        for (const fill of fills) expect(await isRealColor(fill)).toBe(true)
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
