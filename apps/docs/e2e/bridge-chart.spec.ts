import { expect, test } from '@playwright/test'
import { revealCharts, themeSuite } from './support'

themeSuite({
  name: 'bridge-chart',
  path: '/docs/bridge-chart',
  h1: 'BridgeChart',
  chart: 'From quote to cash collected',
})

test('/docs/bridge-chart is a page, and the sidebar links to it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  const response = await page.goto('/docs/bridge-chart')
  expect(response?.status()).toBe(200)

  await expect(page.getByRole('heading', { level: 1, name: 'BridgeChart' })).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Documentation' })
  const link = nav.getByRole('link', { name: 'BridgeChart' })
  await expect(link).toHaveAttribute('href', '/docs/bridge-chart')
  await expect(link).toHaveAttribute('aria-current', 'page')
  await expect(nav.locator('.nav-soon', { hasText: 'BridgeChart' })).toHaveCount(0)
})

test('/docs/bridge-chart documents the BridgeChart props once', async ({ page }) => {
  await page.goto('/docs/bridge-chart')

  await expect(page.getByRole('region', { name: 'Props of BridgeChart', exact: true })).toHaveCount(
    1,
  )
})

test('the page shows both BridgeChart examples', async ({ page }) => {
  await page.goto('/docs/bridge-chart')
  await revealCharts(page)

  await expect(
    page.getByRole('application', { name: 'From quote to cash collected' }),
  ).toBeVisible()
  await expect(
    page.getByRole('application', { name: 'Estimated profit to profit kept, one job' }),
  ).toBeVisible()
})
