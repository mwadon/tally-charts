import { expect, test } from '@playwright/test'
import { themeSuite } from './support'

themeSuite({
  name: 'palettes',
  path: '/docs/palettes',
  h1: 'Palettes',
  chart: 'Margin by week, default palette',
})

test('/docs/palettes is a page, and the sidebar links to it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  const response = await page.goto('/docs/palettes')
  expect(response?.status()).toBe(200)

  await expect(page.getByRole('heading', { level: 1, name: 'Palettes' })).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Documentation' })
  const link = nav.getByRole('link', { name: 'Palettes' })
  await expect(link).toHaveAttribute('href', '/docs/palettes')
  await expect(link).toHaveAttribute('aria-current', 'page')
  await expect(nav.locator('.nav-soon', { hasText: 'Palettes' })).toHaveCount(0)
})

test('the swatches show both palettes', async ({ page }) => {
  await page.goto('/docs/palettes')

  await expect(page.getByRole('list', { name: 'default palette' })).toBeVisible()
  await expect(page.getByRole('list', { name: 'vivid palette' })).toBeVisible()
})

test('the vivid panel sets the palette and still draws a chart', async ({ page }) => {
  await page.goto('/docs/palettes')

  const vivid = page.locator('[data-ch-palette="vivid"]')
  await expect(
    vivid.getByRole('application', { name: 'Margin by week, vivid palette' }),
  ).toBeVisible()
  await expect(vivid).toHaveAttribute('data-ch-theme', 'light')
})
