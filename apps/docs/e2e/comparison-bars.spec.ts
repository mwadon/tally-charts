import { expect, test } from '@playwright/test'
import { revealCharts, themeSuite } from './support'

themeSuite({
  name: 'comparison-bars',
  path: '/docs/comparison-bars',
  h1: 'ComparisonBars',
  chart: 'Job costs, plan vs actual',
})

test('/docs/comparison-bars is a page, and the sidebar links to it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  const response = await page.goto('/docs/comparison-bars')
  expect(response?.status()).toBe(200)

  await expect(page.getByRole('heading', { level: 1, name: 'ComparisonBars' })).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Documentation' })
  const link = nav.getByRole('link', { name: 'ComparisonBars' })
  await expect(link).toHaveAttribute('href', '/docs/comparison-bars')
  await expect(link).toHaveAttribute('aria-current', 'page')
  await expect(nav.locator('.nav-soon', { hasText: 'ComparisonBars' })).toHaveCount(0)
})

test('/docs/comparison-bars documents the ComparisonBars props once', async ({ page }) => {
  await page.goto('/docs/comparison-bars')

  await expect(
    page.getByRole('region', { name: 'Props of ComparisonBars', exact: true }),
  ).toHaveCount(1)
})

test('the page has both examples: costs with good down and revenue with good up', async ({
  page,
}) => {
  await page.goto('/docs/comparison-bars')
  await revealCharts(page)

  await expect(page.getByRole('application', { name: 'Job costs, plan vs actual' })).toBeVisible()
  await expect(
    page.getByRole('application', { name: 'Revenue by region, plan vs actual' }),
  ).toBeVisible()
})
