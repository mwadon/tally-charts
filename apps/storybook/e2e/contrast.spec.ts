import { expect, type Page, test } from '@playwright/test'
import { open, STORIES, THEMELESS } from './stories'

// Rendered text contrast (spec §7, ported from the audit's rendered-contrast.mjs): axe reports
// SVG text as "incomplete", so this measures it. The text color is the computed fill or color
// (with every ancestor's opacity); the background is the screenshot under the text box with all
// text made transparent. The median contrast over the box must reach 4.5:1 (3:1 for large text).

interface TextRun {
  text: string
  x: number
  y: number
  width: number
  height: number
  color: string
  opacity: number
  large: boolean
}

/** Visible text the library renders (charts, heatmaps and their HTML pieces), not story copy. */
function collect(): TextRun[] {
  const root = document.querySelector('#storybook-root') as Element
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const runs: TextRun[] = []
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const el = node.parentElement
    const text = node.textContent?.trim() ?? ''
    if (!el || !text || el.closest('.ch-sr-only, [hidden], title')) continue
    if (!el.closest('[data-ch-root], [data-ch-part]')) continue
    const range = document.createRange()
    range.selectNodeContents(node)
    const box = range.getBoundingClientRect()
    if (box.width < 1 || box.height < 1) continue
    const style = getComputedStyle(el)
    if (style.visibility === 'hidden') continue
    // Fill-less SVG text (fill: none) paints nothing, so there is no colour to measure.
    if (el instanceof SVGElement && style.fill === 'none') continue
    // Text scrolled out of its clipping ancestor (the heatmap scroller) has no pixels to measure.
    // (Inlined: page.evaluate serialises only this function, so no module-level helpers.)
    let clip: DOMRect | null = null
    for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) {
      const s = getComputedStyle(e)
      if ([s.overflow, s.overflowX, s.overflowY].some((v) => v !== 'visible')) {
        clip = e.getBoundingClientRect()
        break
      }
    }
    if (
      clip &&
      (box.right <= clip.left ||
        box.left >= clip.right ||
        box.bottom <= clip.top ||
        box.top >= clip.bottom)
    ) {
      continue
    }
    let opacity = 1
    for (let e: Element | null = el; e && e !== document.body; e = e.parentElement) {
      opacity *= Number(getComputedStyle(e).opacity)
    }
    const size = Number.parseFloat(style.fontSize)
    const bold = Number(style.fontWeight) >= 700
    runs.push({
      text: text.slice(0, 40),
      x: box.x + window.scrollX,
      y: box.y + window.scrollY,
      width: box.width,
      height: box.height,
      color: el instanceof SVGElement ? style.fill : style.color,
      opacity,
      large: size >= 24 || (size >= 18.66 && bold),
    })
  }
  return runs
}

const HIDE = `#storybook-root * { color: transparent !important; text-shadow: none !important; -webkit-text-fill-color: transparent !important; }
#storybook-root svg text, #storybook-root svg tspan { fill: transparent !important; stroke: none !important; }`

interface Result {
  text: string
  /** The median ratio, or null when no pixel under the box could be sampled. */
  ratio: number | null
  need: number
}

/** The median contrast of each run against the pixels under it, in a text-free screenshot. */
async function measure(page: Page): Promise<Result[]> {
  const runs = await page.evaluate(collect)
  const style = await page.addStyleTag({ content: HIDE })
  const shot = (await page.screenshot({ fullPage: true, animations: 'disabled' })).toString(
    'base64',
  )
  await style.evaluate((el) => (el as Element).remove())
  return page.evaluate(
    async ({ runs, shot }) => {
      const image = new Image()
      image.src = `data:image/png;base64,${shot}`
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      const context = canvas.getContext('2d') as CanvasRenderingContext2D
      context.drawImage(image, 0, 0)
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
      const channel = (v: number) => {
        const s = v / 255
        return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
      }
      const lum = ([r = 0, g = 0, b = 0]: number[]) =>
        0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
      // Only sRGB forms are understood: rgb()/rgba() (0–255) and color(srgb …) (0–1).
      const parse = (color: string) => {
        const m = /^(rgba?|color)\((.*)\)$/.exec(color)
        if (!m || (m[1] === 'color' && !/^srgb\s/.test(m[2] ?? ''))) return null
        const body = (m[2] ?? '').replace(/^srgb\s/, '')
        const v = body.match(/-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/gi)?.map(Number) ?? []
        if (v.length < 3 || v.some((c) => Number.isNaN(c))) return null
        const scale = m[1] === 'color' ? 255 : 1
        return { rgb: v.slice(0, 3).map((c) => c * scale), alpha: v[3] ?? 1 }
      }
      return runs.map((run) => {
        const parsed = parse(run.color)
        if (!parsed) throw new Error(`unparseable colour "${run.color}" on "${run.text}"`)
        const { rgb, alpha } = parsed
        const a = alpha * run.opacity
        const ratios: number[] = []
        for (let y = Math.floor(run.y); y < Math.ceil(run.y + run.height); y++) {
          for (let x = Math.floor(run.x); x < Math.ceil(run.x + run.width); x++) {
            if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) continue
            const i = (y * canvas.width + x) * 4
            const bg = [pixels[i] ?? 0, pixels[i + 1] ?? 0, pixels[i + 2] ?? 0]
            const fg = rgb.map((c, k) => c * a + (bg[k] ?? 0) * (1 - a))
            const [hi, lo] = [lum(fg), lum(bg)].sort((p, q) => q - p) as [number, number]
            ratios.push((hi + 0.05) / (lo + 0.05))
          }
        }
        ratios.sort((p, q) => p - q)
        return {
          text: run.text,
          // No sampled pixel is a failure, reported by name in failing(): never a pass.
          ratio: ratios.length > 0 ? (ratios[Math.floor(ratios.length / 2)] ?? null) : null,
          need: run.large ? 3 : 4.5,
        }
      })
    },
    { runs, shot },
  )
}

const failing = (results: Result[]) =>
  results
    .filter((r) => r.ratio === null || r.ratio < r.need)
    .map((r) =>
      r.ratio === null ? `${r.text} no pixels sampled` : `${r.text} ${r.ratio.toFixed(2)}`,
    )

for (const id of [...STORIES, 'reference-last-12-weeks--selectable']) {
  for (const theme of THEMELESS.has(id) ? (['light', 'dark'] as const) : [undefined]) {
    test(`${id}${theme ? ` (${theme})` : ''} text keeps its contrast`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 })
      await open(page, id, theme)
      const rest = await measure(page)
      // Non-vacuity: a story that renders no measurable text would otherwise pass.
      expect(rest.length, 'no rendered text found').toBeGreaterThan(0)
      expect(failing(rest)).toEqual([])
      // With a point active: the tooltip pill, highlighted labels and dimmed marks.
      const widget = page.getByRole('application').first()
      if ((await widget.count()) > 0) {
        await widget.focus()
        await expect(page.locator('[data-ch-part="tooltip"]').first()).toBeVisible()
        const active = await measure(page)
        expect(active.length, 'no rendered text found').toBeGreaterThan(0)
        expect(failing(active)).toEqual([])
      }
    })
  }
}
