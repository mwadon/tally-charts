import { expect, test } from '@playwright/test'
import { themeSuite } from './support'

themeSuite({
  name: 'thresholds',
  path: '/docs/thresholds',
  h1: 'Thresholds',
  chart: 'Page loads by largest contentful paint, colored by tier',
})

test('/docs/thresholds is a page, and the sidebar links to it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  const response = await page.goto('/docs/thresholds')
  expect(response?.status()).toBe(200)

  await expect(page.getByRole('heading', { level: 1, name: 'Thresholds' })).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Documentation' })
  const link = nav.getByRole('link', { name: 'Thresholds' })
  await expect(link).toHaveAttribute('href', '/docs/thresholds')
  await expect(link).toHaveAttribute('aria-current', 'page')
  await expect(nav.locator('.nav-soon', { hasText: 'Thresholds' })).toHaveCount(0)
})

test('/docs/thresholds documents 2 functions', async ({ page }) => {
  await page.goto('/docs/thresholds')

  await expect(page.getByRole('region', { name: /^Parameters of / })).toHaveCount(2)
  await expect(
    page.getByRole('region', { name: 'Parameters of thresholds', exact: true }),
  ).toHaveCount(1)
  await expect(
    page.getByRole('region', { name: 'Parameters of heatmapLevel', exact: true }),
  ).toHaveCount(1)
})

test('a value on a break reads differently with inclusive lower and upper', async ({ page }) => {
  await page.goto('/docs/thresholds')

  await expect(page.getByRole('meter', { name: 'LCP of 2.5 s, inclusive upper' })).toHaveAttribute(
    'aria-valuetext',
    '2.5, Good',
  )
  await expect(page.getByRole('meter', { name: 'LCP of 2.5 s, inclusive lower' })).toHaveAttribute(
    'aria-valuetext',
    '2.5, Needs improvement',
  )
})
