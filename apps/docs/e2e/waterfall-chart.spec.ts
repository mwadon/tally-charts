import { expect, test } from '@playwright/test'
import { themeSuite } from './support'

themeSuite({
  name: 'waterfall-chart',
  path: '/docs/waterfall-chart',
  h1: 'WaterfallChart',
  chart: 'Cash position, March',
})

test('/docs/waterfall-chart is a page, and the sidebar links to it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  const response = await page.goto('/docs/waterfall-chart')
  expect(response?.status()).toBe(200)

  await expect(page.getByRole('heading', { level: 1, name: 'WaterfallChart' })).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Documentation' })
  const link = nav.getByRole('link', { name: 'WaterfallChart' })
  await expect(link).toHaveAttribute('href', '/docs/waterfall-chart')
  await expect(link).toHaveAttribute('aria-current', 'page')
  await expect(nav.locator('.nav-soon', { hasText: 'WaterfallChart' })).toHaveCount(0)
})

test('/docs/waterfall-chart documents the WaterfallChart props once', async ({ page }) => {
  await page.goto('/docs/waterfall-chart')

  await expect(
    page.getByRole('region', { name: 'Props of WaterfallChart', exact: true }),
  ).toHaveCount(1)
})

test('the page shows both WaterfallChart examples', async ({ page }) => {
  await page.goto('/docs/waterfall-chart')

  await expect(page.getByRole('application', { name: 'Cash position, March' })).toBeVisible()
  await expect(
    page.getByRole('application', { name: 'Margin change by driver, Q2 to Q3' }),
  ).toBeVisible()
})
