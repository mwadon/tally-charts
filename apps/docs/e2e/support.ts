import { expect, type Page, test } from '@playwright/test'

export const SURFACE = { light: 'rgb(250, 250, 250)', dark: 'rgb(18, 18, 21)' } as const
export type Theme = keyof typeof SURFACE

/** How the theme is chosen: `?theme=` (forced data-ch-theme) or the OS preference alone. */
export const MODES = ['forced', 'system'] as const
export type Mode = (typeof MODES)[number]

interface PageSpec {
  name: string
  path: string
  h1: string
  chart: string
  /** Role of the chart widget the name is looked up by. Default 'application'; Heatmap is a 'grid', RunwayChart a 'list'. */
  chartRole?: 'application' | 'grid' | 'list' | 'listbox'
}

/** Collects console errors and uncaught page errors; assert `errors` is empty at the end. */
export function collectErrors(page: Page) {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', (err) => errors.push(err.message))
  return errors
}

/** The blocks that mount their chart when they come near the viewport (`LazyMount`). */
const LAZY_CARDS = '.chart-example, .gallery-tile, .card-grid li.card'

/**
 * Scrolls every card with a lazily mounted chart into view and waits until each has its chart,
 * then returns to the top. Call it before an assertion about a chart below the fold.
 */
export async function revealCharts(page: Page) {
  const cards = page.locator(LAZY_CARDS)
  const count = await cards.count()
  for (let i = 0; i < count; i++) {
    const card = cards.nth(i)
    await card.scrollIntoViewIfNeeded()
    // The code panel of a card is hidden and has no placeholder, so only the shown one counts.
    await expect(card.locator('[data-lazy-placeholder]:visible')).toHaveCount(0)
  }
  await page.evaluate(() => window.scrollTo(0, 0))
}

export function themeSuite(spec: PageSpec) {
  const role = spec.chartRole ?? 'application'
  for (const theme of Object.keys(SURFACE) as Theme[]) {
    for (const mode of MODES) {
      test.describe(`${spec.name}, ${theme}, ${mode}`, () => {
        test.use({ colorScheme: theme })

        test('renders the heading and the chart, in the surface color, without errors', async ({
          page,
        }) => {
          const errors = collectErrors(page)
          const response = await page.goto(
            mode === 'forced' ? `${spec.path}?theme=${theme}` : spec.path,
          )
          expect(response?.status()).toBe(200)

          await expect(page.getByRole('heading', { level: 1, name: spec.h1 })).toBeVisible()
          await revealCharts(page)
          const chart = page.getByRole(role, { name: spec.chart })
          await expect(chart).toBeVisible()
          // Only the application widget wraps the SVG; a grid or a list has its own markup.
          if (role === 'application') await expect(chart.locator('svg')).toBeVisible()

          const html = page.locator('html')
          if (mode === 'forced') await expect(html).toHaveAttribute('data-ch-theme', theme)
          else await expect(html).not.toHaveAttribute('data-ch-theme', /.*/)
          await expect(page.locator('body')).toHaveCSS('background-color', SURFACE[theme])

          expect(errors).toEqual([])
        })
      })
    }
  }

  for (const width of [320, 375]) {
    test.describe(`${spec.name}, ${width} px`, () => {
      test.use({ viewport: { width, height: 812 } })

      test('does not scroll horizontally', async ({ page }) => {
        const errors = collectErrors(page)
        await page.goto(spec.path)
        await revealCharts(page)
        await expect(page.getByRole(role, { name: spec.chart })).toBeVisible()

        const sizes = await page.evaluate(() => ({
          root: [document.documentElement.scrollWidth, document.documentElement.clientWidth],
          body: [document.body.scrollWidth, document.body.clientWidth],
        }))
        expect(sizes.root[0]).toBeLessThanOrEqual(sizes.root[1] ?? 0)
        expect(sizes.body[0]).toBeLessThanOrEqual(sizes.body[1] ?? 0)
        expect(errors).toEqual([])
      })
    })
  }

  test('an unknown ?theme= value changes nothing', async ({ page }) => {
    await page.goto(`${spec.path}?theme=sepia`)
    await expect(page.locator('html')).not.toHaveAttribute('data-ch-theme', /.*/)
  })
}

/** Presses Tab until `locator` has focus (at most `max` times) and returns its outline. */
export async function tabTo(page: Page, selector: string, max = 40) {
  const target = page.locator(selector).first()
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab')
    if (await target.evaluate((el) => el === document.activeElement)) {
      return target.evaluate((el) => {
        const cs = getComputedStyle(el)
        return {
          style: cs.outlineStyle,
          width: Number.parseFloat(cs.outlineWidth),
          color: cs.outlineColor,
        }
      })
    }
  }
  throw new Error(`Tab never reached ${selector}`)
}
