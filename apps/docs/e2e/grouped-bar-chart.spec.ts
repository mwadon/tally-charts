import { expect, test } from '@playwright/test'
import { revealCharts, themeSuite } from './support'

themeSuite({
  name: 'grouped-bar-chart',
  path: '/docs/grouped-bar-chart',
  h1: 'GroupedBarChart',
  chart: 'Jobs completed by crew, per quarter',
})

test('/docs/grouped-bar-chart is a page, and the sidebar links to it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  const response = await page.goto('/docs/grouped-bar-chart')
  expect(response?.status()).toBe(200)

  await expect(page.getByRole('heading', { level: 1, name: 'GroupedBarChart' })).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Documentation' })
  const link = nav.getByRole('link', { name: 'GroupedBarChart', exact: true })
  await expect(link).toHaveAttribute('href', '/docs/grouped-bar-chart')
  await expect(link).toHaveAttribute('aria-current', 'page')
  await expect(nav.locator('.nav-soon', { hasText: 'GroupedBarChart' })).toHaveCount(0)
})

test('/docs/grouped-bar-chart documents the GroupedBarChart props once', async ({ page }) => {
  await page.goto('/docs/grouped-bar-chart')

  await expect(
    page.getByRole('region', { name: 'Props of GroupedBarChart', exact: true }),
  ).toHaveCount(1)
})

test('the page has all four examples', async ({ page }) => {
  await page.goto('/docs/grouped-bar-chart')
  await revealCharts(page)

  for (const name of [
    'Jobs completed by crew, per quarter',
    'Jobs by crew, with a forecast quarter',
    'Revenue by service line, this year and last',
    'Tickets closed by team, per month',
  ]) {
    await expect(page.getByRole('application', { name })).toBeVisible()
  }
})
