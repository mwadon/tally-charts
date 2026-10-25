import { expect, test } from '@playwright/test'
import { themeSuite } from './support'

themeSuite({
  name: 'dot-histogram',
  path: '/docs/dot-histogram',
  h1: 'DotHistogram',
  chart: 'Hours to the first reply, one dot per ticket',
})

test('/docs/dot-histogram is a page, and the sidebar links to it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  const response = await page.goto('/docs/dot-histogram')
  expect(response?.status()).toBe(200)

  await expect(page.getByRole('heading', { level: 1, name: 'DotHistogram' })).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Documentation' })
  const link = nav.getByRole('link', { name: 'DotHistogram' })
  await expect(link).toHaveAttribute('href', '/docs/dot-histogram')
  await expect(link).toHaveAttribute('aria-current', 'page')
  await expect(nav.locator('.nav-soon', { hasText: 'DotHistogram' })).toHaveCount(0)
})

test('/docs/dot-histogram documents the DotHistogram props once', async ({ page }) => {
  await page.goto('/docs/dot-histogram')

  await expect(
    page.getByRole('region', { name: 'Props of DotHistogram', exact: true }),
  ).toHaveCount(1)
})

test('the page shows both DotHistogram examples', async ({ page }) => {
  await page.goto('/docs/dot-histogram')

  await expect(
    page.getByRole('application', { name: 'Hours to the first reply, one dot per ticket' }),
  ).toBeVisible()
  await expect(
    page.getByRole('application', { name: 'Open invoices by days overdue, colored by age' }),
  ).toBeVisible()
})
