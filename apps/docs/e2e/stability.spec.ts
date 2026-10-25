import { expect, test } from '@playwright/test'

test('/docs/stability is a page, and the sidebar links to it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  const response = await page.goto('/docs/stability')
  expect(response?.status()).toBe(200)

  await expect(page.getByRole('heading', { level: 1, name: 'Stability' })).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Documentation' })
  const link = nav.getByRole('link', { name: 'Stability' })
  await expect(link).toHaveAttribute('href', '/docs/stability')
  await expect(link).toHaveAttribute('aria-current', 'page')
  await expect(nav.locator('.nav-soon', { hasText: 'Stability' })).toHaveCount(0)
})

test('/docs/stability has a "Not public" section', async ({ page }) => {
  await page.goto('/docs/stability')

  await expect(page.getByRole('heading', { level: 2, name: /^Not public/ })).toBeVisible()
  await expect(page.locator('main a[href="/docs/accessibility#known-limits"]')).toBeVisible()
})
