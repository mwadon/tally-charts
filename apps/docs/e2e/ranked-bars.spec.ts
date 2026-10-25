import { expect, test } from '@playwright/test'
import { revealCharts, themeSuite } from './support'

themeSuite({
  name: 'ranked-bars',
  path: '/docs/ranked-bars',
  h1: 'RankedBars',
  chart: 'Cost overruns by category',
})

test('/docs/ranked-bars is a page, and the sidebar links to it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  const response = await page.goto('/docs/ranked-bars')
  expect(response?.status()).toBe(200)

  await expect(page.getByRole('heading', { level: 1, name: 'RankedBars' })).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Documentation' })
  const link = nav.getByRole('link', { name: 'RankedBars' })
  await expect(link).toHaveAttribute('href', '/docs/ranked-bars')
  await expect(link).toHaveAttribute('aria-current', 'page')
  await expect(nav.locator('.nav-soon', { hasText: 'RankedBars' })).toHaveCount(0)
})

test('/docs/ranked-bars documents the RankedBars props once', async ({ page }) => {
  await page.goto('/docs/ranked-bars')

  await expect(page.getByRole('region', { name: 'Props of RankedBars', exact: true })).toHaveCount(
    1,
  )
})

test('the page has the solid default and the hatch plan as two RankedBars charts', async ({
  page,
}) => {
  await page.goto('/docs/ranked-bars')
  await revealCharts(page)

  await expect(page.getByRole('application', { name: 'Cost overruns by category' })).toBeVisible()
  await expect(page.getByRole('application', { name: 'Planned hours by technician' })).toBeVisible()
})
