import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, type Page, test } from '@playwright/test'
import { revealCharts } from './support'

const navigation: { groups: { items: { slug: string }[] }[] } = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../content/navigation.json'), 'utf8'),
)
const DOC_PAGES = navigation.groups.flatMap((g) => g.items.map((i) => `/docs/${i.slug}`))

const heightsOf = (page: Page, selector: string) =>
  page.locator(selector).evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height))

/** Two animation frames after the fonts: the chart has measured itself and the layout has settled. */
const settle = (page: Page) =>
  page.evaluate(async () => {
    await document.fonts.ready
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  })

/**
 * Heights of the elements before any chart is mounted (the placeholders are what reserves the
 * space) and after every one is, in px; the two lists are index by index.
 */
async function heightsBeforeAndAfter(page: Page, selector: string) {
  await page.waitForLoadState('networkidle')
  const before = await heightsOf(page, selector)
  await revealCharts(page)
  await settle(page)
  return { before, after: await heightsOf(page, selector) }
}

/**
 * `tolerance(height)` is how far a card may move, px. The dashboards are reserved by heights
 * measured on darwin (see `TILE_CHART_HEIGHTS`); the text in a narrow tile wraps with other font
 * metrics on linux, which moved tiles by up to 4%, so that case has a relative bound.
 */
function expectSameHeights(
  selector: string,
  before: number[],
  after: number[],
  tolerance: (height: number) => number = () => 1,
) {
  expect(after).toHaveLength(before.length)
  const moved = before
    .map((h, i) => ({ i, before: h, after: after[i] ?? 0 }))
    .filter((card) => Math.abs(card.after - card.before) > tolerance(card.before))
  // Lists the cards that grew or shrank when their chart mounted, with both heights.
  expect(moved, `${selector}: heights before and after the chart mounts`).toEqual([])
}

/** Layout shift of the page after a jump to its end and a scroll back up in steps, the way a reload or the End key leaves a reader. */
async function layoutShiftScrollingUp(page: Page, path: string) {
  await page.addInitScript(() => {
    const w = window as unknown as { __cls: number }
    w.__cls = 0
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as unknown as {
        value: number
        hadRecentInput: boolean
      }[]) {
        if (!entry.hadRecentInput) w.__cls += entry.value
      }
    }).observe({ type: 'layout-shift', buffered: true })
  })
  await page.goto(path)
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  await page.waitForTimeout(300)
  for (let y = await page.evaluate(() => window.scrollY); y > 0; ) {
    y = await page.evaluate(() => {
      window.scrollBy(0, -200)
      return window.scrollY
    })
    await page.waitForTimeout(40)
  }
  await settle(page)
  return page.evaluate(() => (window as unknown as { __cls: number }).__cls)
}

test.describe('/docs/line-chart, 1280×800', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('the first card has its chart at once, the last mounts on scroll without changing height', async ({
    page,
  }) => {
    await page.goto('/docs/line-chart')
    const cards = page.locator('.chart-example')
    const first = cards.first()
    const last = cards.last()
    expect(await cards.count()).toBeGreaterThan(1)

    await expect(first.getByRole('application')).toHaveCount(1)
    await expect(first.getByRole('application').locator('svg')).toBeVisible()
    await expect(first.locator('[data-lazy-placeholder]')).toHaveCount(0)
    await expect(last.getByRole('application')).toHaveCount(0)
    await expect(last.locator('[data-lazy-placeholder]:visible')).toHaveCount(1)

    const before = await last.boundingBox()
    await last.scrollIntoViewIfNeeded()
    await expect(last.getByRole('application')).toHaveCount(1)
    await expect(last.getByRole('application')).toBeVisible()
    await expect(last.locator('[data-lazy-placeholder]')).toHaveCount(0)
    // Let the chart settle (fonts, the first measure) before measuring the card.
    await page.evaluate(() => document.fonts.ready)
    const after = await last.boundingBox()

    expect(before).not.toBeNull()
    expect(after).not.toBeNull()
    expect(Math.abs((after?.height ?? 0) - (before?.height ?? 0))).toBeLessThanOrEqual(1)
  })
})

test.describe('/, 375×812', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('the hero chart is there at once, the last gallery tile mounts on scroll', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(
      page.locator('.hero').getByRole('application', { name: 'Margin by week, last 6 weeks' }),
    ).toBeVisible()
    expect(await page.locator('.hero [data-lazy-placeholder]').count()).toBe(0)

    const tile = page.locator('.gallery-tile').last()
    await expect(tile.getByRole('application')).toHaveCount(0)
    await expect(tile.locator('[data-lazy-placeholder]')).toHaveCount(1)

    await tile.scrollIntoViewIfNeeded()
    await expect(tile.getByRole('application').first()).toBeVisible()
    await expect(tile.locator('[data-lazy-placeholder]')).toHaveCount(0)
  })
})

test.describe('the card keeps its height when the chart mounts', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  for (const path of DOC_PAGES) {
    test(`${path}: every chart-example card, 1280×800`, async ({ page }) => {
      await page.goto(path)
      const { before, after } = await heightsBeforeAndAfter(page, '.chart-example')
      expectSameHeights('.chart-example', before, after)
    })
  }
})

test.describe('the card keeps its height when the chart mounts, 375×812', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  for (const path of DOC_PAGES) {
    test(`${path}: every chart-example card`, async ({ page }) => {
      await page.goto(path)
      const { before, after } = await heightsBeforeAndAfter(page, '.chart-example')
      // Other font metrics on linux wrap the legends differently (up to a few percent).
      expectSameHeights('.chart-example', before, after, (h) =>
        process.platform === 'darwin' ? 1 : h * 0.05,
      )
    })
  }
})

for (const width of [375, 1280]) {
  test.describe(`/ keeps the height of every card when its chart mounts, ${width} px`, () => {
    test.use({ viewport: { width, height: width === 375 ? 812 : 800 } })

    for (const selector of ['.gallery-tile', '.card-grid li.card']) {
      test(selector, async ({ page }) => {
        await page.goto('/')
        const { before, after } = await heightsBeforeAndAfter(page, selector)
        expect(before.length).toBeGreaterThan(0)
        const fontsDiffer = width === 375 && process.platform !== 'darwin'
        expectSameHeights(selector, before, after, (h) => (fontsDiffer ? h * 0.05 : 1))
      })
    }
  })
}

test.describe('no layout shift when scrolling up after a jump to the end', () => {
  for (const [path, width, height] of [
    ['/', 375, 812],
    ['/', 1280, 800],
    ['/docs/formatting', 1280, 800],
    ['/docs/small-pieces', 375, 812],
  ] as const) {
    test(`${path}, ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height })
      // Good is under 0.1 in Core Web Vitals; the page measured 0.5 with one height for every tile.
      expect(await layoutShiftScrollingUp(page, path)).toBeLessThan(0.1)
    })
  }
})
