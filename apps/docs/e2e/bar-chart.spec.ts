import { expect, test } from '@playwright/test'
import { revealCharts, themeSuite } from './support'

themeSuite({
  name: 'bar-chart',
  path: '/docs/bar-chart',
  h1: 'BarChart',
  chart: 'Margin by week, last 6 weeks',
})

test('/docs/bar-chart is a page, and the sidebar links to it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  const response = await page.goto('/docs/bar-chart')
  expect(response?.status()).toBe(200)

  await expect(page.getByRole('heading', { level: 1, name: 'BarChart' })).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Documentation' })
  const link = nav.getByRole('link', { name: 'BarChart' })
  await expect(link).toHaveAttribute('href', '/docs/bar-chart')
  await expect(link).toHaveAttribute('aria-current', 'page')
  await expect(nav.locator('.nav-soon', { hasText: 'BarChart' })).toHaveCount(0)
})

test('/docs/bar-chart documents the BarChart props once', async ({ page }) => {
  await page.goto('/docs/bar-chart')

  await expect(page.getByRole('region', { name: 'Props of BarChart', exact: true })).toHaveCount(1)
})

test('the page has both examples: a server-safe chart and a selectable one', async ({ page }) => {
  await page.goto('/docs/bar-chart')
  await revealCharts(page)

  await expect(
    page.getByRole('application', { name: 'Margin by week, last 6 weeks' }),
  ).toBeVisible()
  await expect(
    page.getByRole('application', { name: 'Orders by region, select a bar' }),
  ).toBeVisible()
})
