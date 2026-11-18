import { expect, test } from '@playwright/test'
import { revealCharts, themeSuite } from './support'

themeSuite({
  name: 'stacked-bar-chart',
  path: '/docs/stacked-bar-chart',
  h1: 'StackedBarChart',
  chart: 'Monthly job cost by type',
})

test('/docs/stacked-bar-chart is a page, and the sidebar links to it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  const response = await page.goto('/docs/stacked-bar-chart')
  expect(response?.status()).toBe(200)

  await expect(page.getByRole('heading', { level: 1, name: 'StackedBarChart' })).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Documentation' })
  const link = nav.getByRole('link', { name: 'StackedBarChart', exact: true })
  await expect(link).toHaveAttribute('href', '/docs/stacked-bar-chart')
  await expect(link).toHaveAttribute('aria-current', 'page')
  await expect(nav.locator('.nav-soon', { hasText: 'StackedBarChart' })).toHaveCount(0)
})

test('/docs/stacked-bar-chart documents the StackedBarChart props once', async ({ page }) => {
  await page.goto('/docs/stacked-bar-chart')

  await expect(
    page.getByRole('region', { name: 'Props of StackedBarChart', exact: true }),
  ).toHaveCount(1)
})

test('the page has all four examples', async ({ page }) => {
  await page.goto('/docs/stacked-bar-chart')
  await revealCharts(page)

  for (const name of [
    'Monthly job cost by type',
    'Monthly job cost against the $60K budget',
    'Hours booked by crew, this week',
    'Tickets opened by priority, per week',
  ]) {
    await expect(page.getByRole('application', { name })).toBeVisible()
  }
})
