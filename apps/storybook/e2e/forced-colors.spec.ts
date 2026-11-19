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

/**
 * Paint helpers for forced-colors tests: the Canvas colour, a resolver and the `isRealColor` check.
 * The helper checks run here, so a helper that accepts everything fails every test using it.
 */
async function colorHelpers(page: Page) {
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
  return { canvas, resolve, isRealColor }
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
      const { canvas, isRealColor } = await colorHelpers(page)
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

    test(`scatter bubbles, target, rings and labels stay visible (${colorScheme})`, async ({
      page,
    }) => {
      await openForced(page, 'charts-scatterchart--light', colorScheme)
      const { canvas, resolve, isRealColor } = await colorHelpers(page)
      const root = '#storybook-root'
      const bubbles = await page.locator(`${root} [data-ch-part="bubble"]`).evaluateAll((els) =>
        els.map((el) => {
          const style = getComputedStyle(el)
          return { stroke: style.stroke, width: Number.parseFloat(style.strokeWidth) }
        }),
      )
      expect(bubbles).toHaveLength(16)
      // The tinted fill gives way to the page, so the outline alone must carry every bubble.
      for (const bubble of bubbles) {
        expect(await isRealColor(bubble.stroke)).toBe(true)
        expect(bubble.width).toBeGreaterThanOrEqual(1)
      }
      const target = await page.locator(`${root} [data-ch-part="target"]`).evaluate((el) => ({
        stroke: getComputedStyle(el).stroke,
        width: Number.parseFloat(getComputedStyle(el).strokeWidth),
        box: el.getBoundingClientRect().width,
      }))
      expect(await isRealColor(target.stroke)).toBe(true)
      expect(target.width).toBeGreaterThanOrEqual(1)
      expect(target.box).toBeGreaterThan(100)
      for (const part of ['target-label', 'axis-title']) {
        const fills = await page
          .locator(`${root} [data-ch-part="${part}"]`)
          .evaluateAll((els) => els.map((el) => getComputedStyle(el).fill))
        expect(fills.length).toBeGreaterThan(0)
        for (const fill of fills) expect(await isRealColor(fill)).toBe(true)
      }
      // Walking with the keyboard activates a bubble: solid Highlight with a Canvas stroke, and a
      // Highlight ring around it, for an accent bubble and for a loss one (the stylesheet owns the
      // fill, so the tone's own colour never leaks in). System colours are compared as resolved
      // RGBA, not as strings.
      const highlight = await resolve(await systemColor(page, 'Highlight'))
      const canvasRgba = await resolve(canvas)
      await page.keyboard.press('Tab')
      await expect(page.locator(`${root} [role="application"]`)).toBeFocused()
      const sameColor = async (value: string, expected: number[] | null) => {
        expect(expected).not.toBeNull()
        expect(await resolve(value)).toEqual(expected)
      }
      const checkActive = async (tone: string) => {
        const active = page.locator(`${root} [data-ch-part="bubble"][data-ch-active="true"]`)
        await expect(active).toHaveCount(1)
        await expect(active).toHaveAttribute('data-ch-tone', tone)
        const paint = await active.evaluate((el) => ({
          fill: getComputedStyle(el).fill,
          stroke: getComputedStyle(el).stroke,
          width: Number.parseFloat(getComputedStyle(el).strokeWidth),
        }))
        expect(await isRealColor(paint.fill)).toBe(true)
        await sameColor(paint.fill, highlight)
        await sameColor(paint.stroke, canvasRgba)
        expect(paint.width).toBeGreaterThanOrEqual(1.5)
        const ring = await page.locator(`${root} [data-ch-part="bubble-ring"]`).evaluate((el) => ({
          stroke: getComputedStyle(el).stroke,
          width: Number.parseFloat(getComputedStyle(el).strokeWidth),
        }))
        expect(await isRealColor(ring.stroke)).toBe(true)
        await sameColor(ring.stroke, highlight)
        expect(ring.width).toBeGreaterThanOrEqual(1.5)
      }
      await checkActive('accent')
      // End is the largest estimate (accent); one step left is a job under target.
      await page.keyboard.press('End')
      await page.keyboard.press('ArrowLeft')
      await checkActive('loss')
    })

    for (const [story, layers] of [
      ['charts-funnelchart--light', 1],
      ['charts-funnelchart--series', 4],
    ] as const) {
      test(`funnel ribbon, active guide and headers stay visible in ${story} (${colorScheme})`, async ({
        page,
      }) => {
        await openForced(page, story, colorScheme)
        const { canvas, resolve, isRealColor } = await colorHelpers(page)
        const root = '#storybook-root'
        const canvasRgba = await resolve(canvas)
        const areas = await page
          .locator(`${root} path[data-ch-part="funnel-area"]`)
          .evaluateAll((els) =>
            els.map((el) => {
              const style = getComputedStyle(el)
              return {
                fill: style.fill,
                stroke: style.stroke,
                width: Number.parseFloat(style.strokeWidth),
                series: el.getAttribute('data-ch-series'),
              }
            }),
          )
        // The ribbon, or one layer per series: each filled with a system colour, not the page.
        expect(areas).toHaveLength(layers)
        for (const area of areas) {
          expect(await isRealColor(area.fill)).toBe(true)
          // Tones collapse onto few system colours, so Canvas separators keep the layers apart.
          if (area.series) {
            expect(await resolve(area.stroke)).toEqual(canvasRgba)
            expect(area.width).toBeGreaterThanOrEqual(1)
          }
        }
        // Every header text (value, name, continue rate) is painted in a real colour.
        for (const [part, count] of [
          ['funnel-value', 5],
          ['funnel-name', 5],
          ['funnel-rate', 4],
        ] as const) {
          const fills = await page
            .locator(`${root} [data-ch-part="${part}"]`)
            .evaluateAll((els) => els.map((el) => getComputedStyle(el).fill))
          expect(fills).toHaveLength(count)
          for (const fill of fills) expect(await isRealColor(fill)).toBe(true)
        }
        // Walking with the keyboard draws the active step's guide in Highlight, across the figure.
        const highlight = await resolve(await systemColor(page, 'Highlight'))
        expect(highlight).not.toBeNull()
        await page.keyboard.press('Tab')
        await expect(page.locator(`${root} [role="application"]`)).toBeFocused()
        await page.keyboard.press('ArrowRight')
        const guide = page.locator(`${root} [data-ch-part="funnel-guide"][data-ch-active="true"]`)
        await expect(guide).toHaveCount(1)
        const paint = await guide.evaluate((el) => ({
          stroke: getComputedStyle(el).stroke,
          width: Number.parseFloat(getComputedStyle(el).strokeWidth),
          height: el.getBoundingClientRect().height,
        }))
        expect(await isRealColor(paint.stroke)).toBe(true)
        expect(await resolve(paint.stroke)).toEqual(highlight)
        expect(paint.width).toBeGreaterThanOrEqual(1.5)
        expect(paint.height).toBeGreaterThan(200)
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
