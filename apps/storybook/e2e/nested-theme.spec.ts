import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'
import { channels, contrastOf, open } from './stories'

// A dark card nested in a light page. Under maxDiffPixelRatio a 3px marker can vanish without a
// screenshot noticing (7de9111 resolved --ch-zone-marker on :root, so the marker took the light
// page's dark ink on the dark card), so these tests measure computed style. Not in STORIES: no
// baseline.
const NESTED_DARK = 'primitives-small-pieces--nested-dark'
const MARKER = '[data-testid=nested-dark] [data-ch-part="zone-meter-marker"]'
const SEGMENTS = '[data-testid=nested-dark] [data-ch-part="share-segment"]'

// WCAG 1.4.11 non-text contrast.
const MIN_CONTRAST = 3

interface Mark {
  backgroundColor: string
  /** Product of the element's and its ancestors' opacity. */
  opacity: number
  visibility: string
  display: string
  width: number
  height: number
}

interface Measured {
  marker: Mark | null
  segments: Mark[]
  cardBackground: string
  canvasTheme: string | null
  canvasInk: string
}

/** Computed style of the nested card's marker and segments, taken in the page. */
function measure(page: Page): Promise<Measured> {
  // (Inlined: page.evaluate serialises only this function, so no module-level helpers.)
  return page.evaluate(
    ([markerSelector, segmentSelector]) => {
      const mark = (el: Element): Mark => {
        const style = getComputedStyle(el)
        let opacity = 1
        for (let n: Element | null = el; n; n = n.parentElement) {
          opacity *= Number.parseFloat(getComputedStyle(n).opacity)
        }
        const box = el.getBoundingClientRect()
        return {
          backgroundColor: style.backgroundColor,
          opacity,
          visibility: style.visibility,
          display: style.display,
          width: box.width,
          height: box.height,
        }
      }
      const marker = document.querySelector(markerSelector as string)
      const canvas = document.querySelector('#storybook-root .sb-canvas') as Element
      const card = document.querySelector('[data-testid=nested-dark]') as Element
      return {
        marker: marker ? mark(marker) : null,
        segments: [...document.querySelectorAll(segmentSelector as string)].map(mark),
        cardBackground: getComputedStyle(card).backgroundColor,
        canvasTheme: canvas.getAttribute('data-ch-theme'),
        canvasInk: getComputedStyle(canvas).color,
      }
    },
    [MARKER, SEGMENTS],
  )
}

/** Alpha of a computed color: `rgba(r, g, b, a)`, `rgb(r g b / a)` or `color(srgb r g b / a)`. */
function alphaOf(color: string): number {
  const slash = color.match(/\/\s*([\d.]+)(%?)\s*\)/)
  if (slash) return Number(slash[1]) / (slash[2] ? 100 : 1)
  const comma = color.match(/^rgba\(\s*[\d.]+,\s*[\d.]+,\s*[\d.]+,\s*([\d.]+)\s*\)$/)
  return comma ? Number(comma[1]) : 1
}

function luminanceOf(color: string): number {
  const [r = 0, g = 0, b = 0] = channels(color).map((v) => {
    const s = v / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Everything that makes a small mark visible, with its contrast against the card behind it. */
function problems(name: string, mark: Mark | null, background: string): string[] {
  if (!mark) return [`${name}: not rendered`]
  const out: string[] = []
  if (mark.display === 'none') out.push(`${name}: display is none`)
  if (mark.visibility === 'hidden') out.push(`${name}: visibility is hidden`)
  if (!(mark.width >= 2)) out.push(`${name}: ${mark.width}px wide, needs at least 2px`)
  if (!(mark.height > 0)) out.push(`${name}: no height`)
  if (!(mark.opacity > 0)) out.push(`${name}: opacity ${mark.opacity}`)
  if (!(alphaOf(mark.backgroundColor) > 0)) {
    out.push(`${name}: transparent background ${mark.backgroundColor}`)
  }
  const contrast = contrastOf(mark.backgroundColor, background)
  if (contrast < MIN_CONTRAST) {
    out.push(
      `${name}: contrast ${contrast.toFixed(2)}:1 of ${mark.backgroundColor} on ${background}, needs ${MIN_CONTRAST}:1`,
    )
  }
  return out
}

function allProblems(m: Measured): string[] {
  return [
    ...problems('zone-meter-marker', m.marker, m.cardBackground),
    ...m.segments.flatMap((s, i) => problems(`share-segment ${i}`, s, m.cardBackground)),
  ]
}

test('the nested dark card sits on a light page', async ({ page }) => {
  await open(page, NESTED_DARK)
  const m = await measure(page)
  expect(m.canvasTheme).toBe('light')
  expect(channels(m.canvasInk)[0]).toBeLessThan(128)
  expect(luminanceOf(m.cardBackground)).toBeLessThan(0.1)
  expect(m.segments).toHaveLength(3)
})

test('the ZoneMeter marker and every ShareBar segment stay visible on the nested dark card', async ({
  page,
}) => {
  await open(page, NESTED_DARK)
  expect(allProblems(await measure(page))).toEqual([])
})

// Safety net: each test re-creates a failure the check above must catch, so the check itself
// cannot silently stop measuring.
test('the check catches the 7de9111 bug: a marker color resolved on :root', async ({ page }) => {
  await open(page, NESTED_DARK)
  await page.addStyleTag({ content: ':root { --ch-zone-marker: var(--ch-ink) }' })
  const m = await measure(page)
  expect(contrastOf(m.marker?.backgroundColor ?? '', m.cardBackground)).toBeLessThan(MIN_CONTRAST)
  expect(allProblems(m)).toContainEqual(expect.stringMatching(/^zone-meter-marker: contrast /))
})

test('the check catches a ShareBar segment that takes the card color', async ({ page }) => {
  await open(page, NESTED_DARK)
  await page.addStyleTag({
    content: '[data-ch-part="share-segment"] { background: var(--ch-surface) !important }',
  })
  const m = await measure(page)
  expect(m.segments).toHaveLength(3)
  for (const s of m.segments) {
    expect(contrastOf(s.backgroundColor, m.cardBackground)).toBeLessThan(MIN_CONTRAST)
  }
  expect(allProblems(m).filter((p) => p.startsWith('share-segment'))).toHaveLength(3)
})

test('the check catches a hidden, transparent or collapsed marker', async ({ page }) => {
  for (const content of [
    '[data-ch-part="zone-meter-marker"] { display: none }',
    '[data-ch-part="zone-meter-marker"] { visibility: hidden }',
    '[data-ch-part="zone-meter-marker"] { background: transparent }',
    '[data-ch-part="zone-meter-marker"] { opacity: 0 }',
    '[data-ch-part="zone-meter-marker"] { width: 1px }',
  ]) {
    await open(page, NESTED_DARK)
    await page.addStyleTag({ content })
    expect(allProblems(await measure(page)), content).not.toEqual([])
  }
})

test('the nested dark story has no axe violations', async ({ page }) => {
  await open(page, NESTED_DARK)
  const results = await new AxeBuilder({ page })
    .include('#storybook-root')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze()
  expect(results.violations).toEqual([])
})
