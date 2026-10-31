import { expect, type Page, test } from '@playwright/test'
import { open } from './stories'

// The endpoint is HTML in percent because an SVG circle in a stretched viewBox would be an
// ellipse. A screenshot can't tell a 1px skew, so measure: the dot is square and round, and its
// centre is the line's last point after the viewBox is stretched to the box.
const STORY = 'primitives-small-pieces--sparklines'

for (const width of [120, 240, 400]) {
  test(`the endpoint stays round and on the line's end at ${width}px`, async ({ page }) => {
    await open(page, STORY)
    const box = page.getByTestId(`sparkline-${width}`)
    const m = await box.evaluate((el) => {
      const dot = el.querySelector('[data-ch-part="sparkline-endpoint"]') as HTMLElement
      const line = el.querySelector('[data-ch-part="sparkline-line"]') as SVGPathElement
      const r = dot.getBoundingClientRect()
      const end = line.getPointAtLength(line.getTotalLength())
      const ctm = line.getScreenCTM() as DOMMatrix
      return {
        root: el.getBoundingClientRect().width,
        w: r.width,
        h: r.height,
        radius: getComputedStyle(dot).borderTopLeftRadius,
        cx: r.left + r.width / 2,
        cy: r.top + r.height / 2,
        ex: ctm.a * end.x + ctm.c * end.y + ctm.e,
        ey: ctm.b * end.x + ctm.d * end.y + ctm.f,
        circles: el.querySelectorAll('circle').length,
      }
    })
    expect(m.root).toBeCloseTo(width, 0)
    expect(m.circles).toBe(0)
    expect(m.w).toBeCloseTo(m.h, 1)
    expect(m.radius).toBe('50%')
    expect(Math.abs(m.cx - m.ex)).toBeLessThanOrEqual(0.5)
    expect(Math.abs(m.cy - m.ey)).toBeLessThanOrEqual(0.5)
  })
}

const LAYOUTS = 'primitives-small-pieces--sparkline-layouts'
const widthIn = async (page: Page, id: string) =>
  page
    .getByTestId(id)
    .locator('[data-ch-part="sparkline"]')
    .evaluate((el) => el.getBoundingClientRect().width)

test('fills a block parent, a flex row and a table cell', async ({ page }) => {
  await open(page, LAYOUTS)
  expect(await widthIn(page, 'in-block')).toBeCloseTo(400, 0)
  expect(await widthIn(page, 'in-flex')).toBeCloseTo(400, 0)
  // It shares the row with a fixed 100 px sibling and an 8 px gap.
  expect(await widthIn(page, 'in-flex-sibling')).toBeCloseTo(292, 0)
  const cell = await page.getByTestId('in-cell').evaluate((el) => el.clientWidth)
  expect(cell).toBeGreaterThan(150)
  expect(await widthIn(page, 'in-table')).toBeGreaterThanOrEqual(cell - 4)
})

test('draws isolated values as round dots', async ({ page }) => {
  await open(page, LAYOUTS)
  const png = await page.getByTestId('isolated').screenshot()
  // Bounding boxes of the painted pixels, per horizontal third: left edge, centre, right edge.
  const dots = await page.evaluate(async (base64) => {
    const bitmap = await createImageBitmap(
      await (await fetch(`data:image/png;base64,${base64}`)).blob(),
    )
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
    const g = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D
    g.drawImage(bitmap, 0, 0)
    const { data } = g.getImageData(0, 0, bitmap.width, bitmap.height)
    const [r0, g0, b0] = [data[0] as number, data[1] as number, data[2] as number]
    const boxes = [0, 1, 2].map(() => ({ x0: 1e9, x1: -1, y0: 1e9, y1: -1 }))
    for (let y = 0; y < bitmap.height; y++) {
      for (let x = 0; x < bitmap.width; x++) {
        const i = (y * bitmap.width + x) * 4
        const far =
          Math.abs((data[i] as number) - r0) +
            Math.abs((data[i + 1] as number) - g0) +
            Math.abs((data[i + 2] as number) - b0) >
          60
        if (!far) continue
        const box = boxes[Math.min(2, Math.floor((x / bitmap.width) * 3))] as (typeof boxes)[number]
        box.x0 = Math.min(box.x0, x)
        box.x1 = Math.max(box.x1, x)
        box.y0 = Math.min(box.y0, y)
        box.y1 = Math.max(box.y1, y)
      }
    }
    return boxes
  }, png.toString('base64'))
  for (const dot of dots) {
    const w = dot.x1 - dot.x0 + 1
    const h = dot.y1 - dot.y0 + 1
    expect(w).toBeGreaterThanOrEqual(1)
    expect(h).toBeLessThanOrEqual(4)
    expect(Math.abs(w - h)).toBeLessThanOrEqual(1)
  }
})
