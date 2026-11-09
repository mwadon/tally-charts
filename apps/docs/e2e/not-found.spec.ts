import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { collectErrors, SURFACE, type Theme } from './support'

/** An unknown path, an unknown docs slug (inside the docs layout) and a nested one. */
const MISSING = ['/does-not-exist', '/docs/does-not-exist', '/docs/line-chart/deeper']

for (const theme of Object.keys(SURFACE) as Theme[]) {
  test.describe(`404 page, ${theme}`, () => {
    test.use({ colorScheme: theme })

    for (const path of MISSING) {
      test(`${path} (${theme}) answers 404 with the page and has no axe violations`, async ({
        page,
      }) => {
        const errors = collectErrors(page)
        const response = await page.goto(`${path}?theme=${theme}`)
        expect(response?.status()).toBe(404)
        await expect(page.locator('html')).toHaveAttribute('data-ch-theme', theme)
        await expect(page.locator('body')).toHaveCSS('background-color', SURFACE[theme])

        const headings = page.getByRole('heading', { level: 1 })
        await expect(headings).toHaveCount(1)
        await expect(headings).toHaveText('Page not found')
        // After `notFound()` in /docs/[slug] Next renders the page in the browser and the title
        // falls back to the one of the root layout; a path without a route keeps the 404 title.
        await expect(page).toHaveTitle(
          path.startsWith('/docs/does') ? 'tally-charts' : 'Page not found · tally-charts',
        )
        await expect(page.locator('.site-header .wordmark')).toBeVisible()
        await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
        await page.waitForLoadState('networkidle')

        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze()
        expect(
          results.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            targets: v.nodes.map((n) => n.target),
          })),
        ).toEqual([])
        // The browser logs the 404 of the document itself; nothing else may be logged.
        expect(errors.filter((e) => !e.includes('404'))).toEqual([])
      })
    }
  })
}

test('the links of the 404 page lead to the home page and to Getting started', async ({ page }) => {
  await page.goto('/docs/does-not-exist')
  const main = page.locator('main#main')

  await main.getByRole('link', { name: 'Getting started' }).click()
  await expect(page).toHaveURL(/\/docs\/getting-started$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Getting started' })).toBeVisible()

  await page.goto('/does-not-exist')
  await page.locator('main#main').getByRole('link', { name: 'Home' }).click()
  await expect(page).toHaveURL(/127\.0\.0\.1:3100\/$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Opinionated React charts for narrative business dashboards.',
  )
})

test('the skip link of the 404 page moves to #main', async ({ page }) => {
  await page.goto('/does-not-exist')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.waitForLoadState('networkidle')

  await page.keyboard.press('Tab')
  await expect(page.locator('.skip-link')).toBeFocused()
  await page.keyboard.press('Enter')
  await expect.poll(() => page.evaluate(() => location.hash === '#main')).toBe(true)
})

test.describe('404 page, 320 px', () => {
  test.use({ viewport: { width: 320, height: 812 } })

  test('does not scroll horizontally', async ({ page }) => {
    await page.goto('/does-not-exist')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    const sizes = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      document.documentElement.clientWidth,
    ])
    expect(sizes[0]).toBeLessThanOrEqual(sizes[1] ?? 0)
  })
})
