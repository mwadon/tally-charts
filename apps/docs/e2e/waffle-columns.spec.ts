import { expect, test } from '@playwright/test'
import { revealCharts, themeSuite } from './support'

themeSuite({
  name: 'waffle-columns',
  path: '/docs/waffle-columns',
  h1: 'WaffleColumns',
  chart: 'Newsletter signups per week',
})

test('/docs/waffle-columns is a page, and the sidebar links to it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  const response = await page.goto('/docs/waffle-columns')
  expect(response?.status()).toBe(200)

  await expect(page.getByRole('heading', { level: 1, name: 'WaffleColumns' })).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Documentation' })
  const link = nav.getByRole('link', { name: 'WaffleColumns' })
  await expect(link).toHaveAttribute('href', '/docs/waffle-columns')
  await expect(link).toHaveAttribute('aria-current', 'page')
  await expect(nav.locator('.nav-soon', { hasText: 'WaffleColumns' })).toHaveCount(0)
})

test('/docs/waffle-columns documents the WaffleColumns props once', async ({ page }) => {
  await page.goto('/docs/waffle-columns')

  await expect(
    page.getByRole('region', { name: 'Props of WaffleColumns', exact: true }),
  ).toHaveCount(1)
})

test('the page shows both WaffleColumns examples', async ({ page }) => {
  await page.goto('/docs/waffle-columns')
  await revealCharts(page)

  await expect(page.getByRole('application', { name: 'Newsletter signups per week' })).toBeVisible()
  await expect(
    page.getByRole('application', { name: 'Warranty claims per month, by quarter' }),
  ).toBeVisible()
})
