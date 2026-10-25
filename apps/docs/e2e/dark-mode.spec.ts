import { expect, test } from '@playwright/test'
import { themeSuite } from './support'

themeSuite({
  name: 'dark-mode',
  path: '/docs/dark-mode',
  h1: 'Dark mode',
  chart: 'Orders by month, light theme',
})

test('/docs/dark-mode is a page, and the sidebar links to it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  const response = await page.goto('/docs/dark-mode')
  expect(response?.status()).toBe(200)

  await expect(page.getByRole('heading', { level: 1, name: 'Dark mode' })).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Documentation' })
  const link = nav.getByRole('link', { name: 'Dark mode' })
  await expect(link).toHaveAttribute('href', '/docs/dark-mode')
  await expect(link).toHaveAttribute('aria-current', 'page')
  await expect(nav.locator('.nav-soon', { hasText: 'Dark mode' })).toHaveCount(0)
})

test('the example draws one chart in the light and one in the dark theme', async ({ page }) => {
  await page.goto('/docs/dark-mode')

  await expect(
    page
      .locator('[data-ch-theme="light"]')
      .getByRole('application', { name: 'Orders by month, light theme' }),
  ).toBeVisible()
  await expect(
    page
      .locator('[data-ch-theme="dark"]')
      .getByRole('application', { name: 'Orders by month, dark theme' }),
  ).toBeVisible()
})

test('the next-themes recipe is on the page', async ({ page }) => {
  await page.goto('/docs/dark-mode')

  await expect(page.getByText("attribute={['class', 'data-ch-theme']}")).toBeVisible()
})
