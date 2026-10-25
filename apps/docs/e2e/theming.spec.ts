import { expect, test } from '@playwright/test'
import { themeSuite } from './support'

themeSuite({
  name: 'theming',
  path: '/docs/theming',
  h1: 'Theming',
  chart: 'Revenue by month, default tokens',
})

test('/docs/theming is a page, and the sidebar links to it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  const response = await page.goto('/docs/theming')
  expect(response?.status()).toBe(200)

  await expect(page.getByRole('heading', { level: 1, name: 'Theming' })).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Documentation' })
  const link = nav.getByRole('link', { name: 'Theming' })
  await expect(link).toHaveAttribute('href', '/docs/theming')
  await expect(link).toHaveAttribute('aria-current', 'page')
  await expect(nav.locator('.nav-soon', { hasText: 'Theming' })).toHaveCount(0)
})

test('the token tables list the theme and the shared tokens', async ({ page }) => {
  await page.goto('/docs/theming')

  await expect(page.getByRole('region', { name: 'Tokens: theme' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Tokens: shared' })).toBeVisible()
  await expect(page.getByRole('rowheader', { name: '--ch-accent', exact: true })).toBeVisible()
})

test('the override example changes the accent, and the nested panel is dark', async ({ page }) => {
  await page.goto('/docs/theming')

  await expect(
    page.getByRole('application', { name: 'Revenue by month, overridden tokens' }),
  ).toBeVisible()
  const panel = page.locator('[data-ch-theme="dark"]', {
    has: page.getByRole('application', { name: 'Active users, in a dark panel' }),
  })
  await expect(panel).toBeVisible()
  await expect(panel).toHaveCSS('background-color', 'rgb(18, 18, 21)')
})
