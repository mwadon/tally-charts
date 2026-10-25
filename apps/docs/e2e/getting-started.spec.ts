import { expect, test } from '@playwright/test'
import { themeSuite } from './support'

themeSuite({
  name: 'getting-started',
  path: '/docs/getting-started',
  h1: 'Getting started',
  chart: 'Revenue by month, first half',
})

test('/docs/getting-started is a page, and the sidebar links to it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  const response = await page.goto('/docs/getting-started')
  expect(response?.status()).toBe(200)

  await expect(page.getByRole('heading', { level: 1, name: 'Getting started' })).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Documentation' })
  const link = nav.getByRole('link', { name: 'Getting started' })
  await expect(link).toHaveAttribute('href', '/docs/getting-started')
  await expect(link).toHaveAttribute('aria-current', 'page')
  await expect(nav.locator('.nav-soon', { hasText: 'Getting started' })).toHaveCount(0)
})

test('the home page links to Getting started', async ({ page }) => {
  await page.goto('/')

  const row = page.locator('ul.link-row')
  await expect(row.getByRole('link', { name: /Getting started/ })).toHaveAttribute(
    'href',
    '/docs/getting-started',
  )
  await expect(row.locator('.nav-soon')).toHaveCount(0)
})

test('Next steps links to the composition, small pieces and hooks pages', async ({ page }) => {
  await page.goto('/docs/getting-started')

  const main = page.getByRole('main')
  for (const href of ['/docs/composition', '/docs/small-pieces', '/docs/hooks-and-providers']) {
    await expect(main.locator(`a[href="${href}"]`)).toHaveCount(1)
  }
})
