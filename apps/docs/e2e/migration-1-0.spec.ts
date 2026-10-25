import { expect, test } from '@playwright/test'
import { revealCharts, themeSuite } from './support'

test('/docs/migration-1-0 is a page, and the sidebar links to it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  const response = await page.goto('/docs/migration-1-0')
  expect(response?.status()).toBe(200)

  await expect(page.getByRole('heading', { level: 1, name: 'Migration to 1.0' })).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Documentation' })
  const link = nav.getByRole('link', { name: 'Migration to 1.0' })
  await expect(link).toHaveAttribute('href', '/docs/migration-1-0')
  await expect(link).toHaveAttribute('aria-current', 'page')
  await expect(nav.locator('.nav-soon')).toHaveCount(0)
})

test('/docs/migration-1-0 has the breaking and additive sections, with an example after', async ({
  page,
}) => {
  await page.goto('/docs/migration-1-0')
  await revealCharts(page)

  await expect(page.getByRole('heading', { level: 2, name: /^Breaking changes/ })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: /^Additive changes/ })).toBeVisible()
  const chart = page.getByRole('application', { name: 'Margin by week' })
  await expect(chart).toBeVisible()
  await expect(chart.locator('svg').first()).toBeVisible()
  // The second example is named by the heading above it, not by a title.
  await expect(page.getByRole('application', { name: 'Weekly margin' })).toBeVisible()
})

themeSuite({
  name: 'migration-1-0',
  path: '/docs/migration-1-0',
  h1: 'Migration to 1.0',
  chart: 'Margin by week',
})
