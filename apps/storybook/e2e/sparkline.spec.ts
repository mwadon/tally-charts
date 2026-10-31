import { expect, test } from '@playwright/test'
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
