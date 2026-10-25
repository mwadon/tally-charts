import { expect, test } from '@playwright/test'
import { themeSuite } from './support'

themeSuite({
  name: 'server-components',
  path: '/docs/server-components',
  h1: 'Server Components',
  chart: 'Median load time by page, rendered on the server',
})

test('/docs/server-components is a page, and the sidebar links to it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  const response = await page.goto('/docs/server-components')
  expect(response?.status()).toBe(200)

  await expect(page.getByRole('heading', { level: 1, name: 'Server Components' })).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Documentation' })
  const link = nav.getByRole('link', { name: 'Server Components' })
  await expect(link).toHaveAttribute('href', '/docs/server-components')
  await expect(link).toHaveAttribute('aria-current', 'page')
  await expect(nav.locator('.nav-soon', { hasText: 'Server Components' })).toHaveCount(0)
})

test('the server-rendered meter names the zone of its value', async ({ page }) => {
  await page.goto('/docs/server-components')

  await expect(
    page.getByRole('meter', { name: 'Median load time of the checkout page' }),
  ).toHaveAttribute('aria-valuetext', '3.6, Needs improvement')
})
