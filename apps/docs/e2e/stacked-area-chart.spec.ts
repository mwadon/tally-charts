import { expect, test } from '@playwright/test'
import { revealCharts, themeSuite } from './support'

themeSuite({
  name: 'stacked-area-chart',
  path: '/docs/stacked-area-chart',
  h1: 'StackedAreaChart',
  chart: 'Crew hours per week, by type of work',
})

test('/docs/stacked-area-chart is a page, and the sidebar links to it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  const response = await page.goto('/docs/stacked-area-chart')
  expect(response?.status()).toBe(200)

  await expect(page.getByRole('heading', { level: 1, name: 'StackedAreaChart' })).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Documentation' })
  const link = nav.getByRole('link', { name: 'StackedAreaChart', exact: true })
  await expect(link).toHaveAttribute('href', '/docs/stacked-area-chart')
  await expect(link).toHaveAttribute('aria-current', 'page')
  await expect(nav.locator('.nav-soon', { hasText: 'StackedAreaChart' })).toHaveCount(0)
})

test('/docs/stacked-area-chart documents the StackedAreaChart props once', async ({ page }) => {
  await page.goto('/docs/stacked-area-chart')

  await expect(
    page.getByRole('region', { name: 'Props of StackedAreaChart', exact: true }),
  ).toHaveCount(1)
})

test('the page has all four examples', async ({ page }) => {
  await page.goto('/docs/stacked-area-chart')
  await revealCharts(page)

  for (const name of [
    'Crew hours per week, by type of work',
    'Crew hours per week, booked from W10',
    'Crew hours per month',
    'Crew hours per week, with a legend',
  ]) {
    await expect(page.getByRole('application', { name })).toBeVisible()
  }
})
