import { expect, test } from '@playwright/test'
import { revealCharts, themeSuite } from './support'

themeSuite({
  name: 'strip-plot',
  path: '/docs/strip-plot',
  h1: 'StripPlot',
  chart: 'Days to deliver, promised against actual',
})

test('/docs/strip-plot is a page, and the sidebar links to it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  const response = await page.goto('/docs/strip-plot')
  expect(response?.status()).toBe(200)

  await expect(page.getByRole('heading', { level: 1, name: 'StripPlot' })).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Documentation' })
  const link = nav.getByRole('link', { name: 'StripPlot' })
  await expect(link).toHaveAttribute('href', '/docs/strip-plot')
  await expect(link).toHaveAttribute('aria-current', 'page')
  await expect(nav.locator('.nav-soon', { hasText: 'StripPlot' })).toHaveCount(0)
})

test('/docs/strip-plot documents the StripPlot props once', async ({ page }) => {
  await page.goto('/docs/strip-plot')

  await expect(page.getByRole('region', { name: 'Props of StripPlot', exact: true })).toHaveCount(1)
})

test('the page shows both StripPlot examples', async ({ page }) => {
  await page.goto('/docs/strip-plot')
  await revealCharts(page)

  await expect(
    page.getByRole('application', { name: 'Days to deliver, promised against actual' }),
  ).toBeVisible()
  await expect(
    page.getByRole('application', { name: 'Practice exam scores, three attempts per student' }),
  ).toBeVisible()
})
