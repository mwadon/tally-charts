import { expect, test } from '@playwright/test'
import { themeSuite } from './support'

themeSuite({
  name: 'formatting',
  path: '/docs/formatting',
  h1: 'Formatting',
  chart: 'Revenue by month, formatted with createFormatter and createDateFormatter',
})

test('/docs/formatting is a page, and the sidebar links to it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  const response = await page.goto('/docs/formatting')
  expect(response?.status()).toBe(200)

  await expect(page.getByRole('heading', { level: 1, name: 'Formatting' })).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Documentation' })
  const link = nav.getByRole('link', { name: 'Formatting' })
  await expect(link).toHaveAttribute('href', '/docs/formatting')
  await expect(link).toHaveAttribute('aria-current', 'page')
  await expect(nav.locator('.nav-soon', { hasText: 'Formatting' })).toHaveCount(0)
})

test('/docs/formatting documents 3 functions', async ({ page }) => {
  await page.goto('/docs/formatting')

  await expect(page.getByRole('region', { name: /^Parameters of / })).toHaveCount(3)
  await expect(
    page.getByRole('region', { name: 'Parameters of createFormatter', exact: true }),
  ).toHaveCount(1)
  await expect(
    page.getByRole('region', { name: 'Parameters of createFormatters', exact: true }),
  ).toHaveCount(1)
  await expect(
    page.getByRole('region', { name: 'Parameters of createDateFormatter', exact: true }),
  ).toHaveCount(1)
})

test('the chart announces euros from createFormatter, in German', async ({ page }) => {
  await page.goto('/docs/formatting')

  const chart = page.getByRole('application', {
    name: 'Revenue by month, formatted with createFormatter and createDateFormatter',
  })
  const live = page.locator('[data-ch-root]').filter({ has: chart }).locator('[aria-live="polite"]')
  await chart.focus()
  await page.keyboard.press('Home')
  await expect(live).toContainText('1 of 6')
  await expect(live).toContainText('12.400')
  await expect(live).toContainText('€')
})
