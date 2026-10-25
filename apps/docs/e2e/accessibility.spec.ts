import { expect, test } from '@playwright/test'

test('/docs/accessibility is a page, and the sidebar links to it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  const response = await page.goto('/docs/accessibility')
  expect(response?.status()).toBe(200)

  await expect(page.getByRole('heading', { level: 1, name: 'Accessibility' })).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Documentation' })
  const link = nav.getByRole('link', { name: 'Accessibility' })
  await expect(link).toHaveAttribute('href', '/docs/accessibility')
  await expect(link).toHaveAttribute('aria-current', 'page')
  await expect(nav.locator('.nav-soon', { hasText: 'Accessibility' })).toHaveCount(0)
})

test('/docs/accessibility has a "Known limits" section', async ({ page }) => {
  await page.goto('/docs/accessibility')

  await expect(page.getByRole('heading', { level: 2, name: /^Known limits/ })).toBeVisible()
})
