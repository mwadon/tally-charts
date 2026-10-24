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

export function themeSuite(spec: PageSpec) {
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
          const chart = page.getByRole('application', { name: spec.chart })
          await expect(chart).toBeVisible()
          await expect(chart.locator('svg')).toBeVisible()

          const html = page.locator('html')
          if (mode === 'forced') await expect(html).toHaveAttribute('data-ch-theme', theme)
          else await expect(html).not.toHaveAttribute('data-ch-theme', /.*/)
          await expect(page.locator('body')).toHaveCSS('background-color', SURFACE[theme])

          expect(errors).toEqual([])
        })
      })
    }
  }

  test.describe(`${spec.name}, 375 px`, () => {
    test.use({ viewport: { width: 375, height: 812 } })

    test('does not scroll horizontally', async ({ page }) => {
      const errors = collectErrors(page)
      await page.goto(spec.path)
      await expect(page.getByRole('application', { name: spec.chart })).toBeVisible()

      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.body.scrollWidth,
        clientWidth: document.body.clientWidth,
      }))
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
      expect(errors).toEqual([])
    })
  })

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
