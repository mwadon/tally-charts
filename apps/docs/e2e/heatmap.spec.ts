import { expect, test } from '@playwright/test'
import { themeSuite } from './support'

const FIRST = 'On-call pages by team and shift'
const SECOND = 'Trial-to-paid conversion by channel and plan'

themeSuite({
  name: 'heatmap',
  path: '/docs/heatmap',
  h1: 'Heatmap',
  chart: FIRST,
  chartRole: 'grid',
})

test('/docs/heatmap is a page, and the sidebar links to it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  const response = await page.goto('/docs/heatmap')
  expect(response?.status()).toBe(200)

  await expect(page.getByRole('heading', { level: 1, name: 'Heatmap' })).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Documentation' })
  const link = nav.getByRole('link', { name: 'Heatmap' })
  await expect(link).toHaveAttribute('href', '/docs/heatmap')
  await expect(link).toHaveAttribute('aria-current', 'page')
  await expect(nav.locator('.nav-soon', { hasText: 'Heatmap' })).toHaveCount(0)
})

test('/docs/heatmap documents the Heatmap props once', async ({ page }) => {
  await page.goto('/docs/heatmap')

  await expect(page.getByRole('region', { name: 'Props of Heatmap', exact: true })).toHaveCount(1)
})

test('the page shows both Heatmap examples as grids', async ({ page }) => {
  await page.goto('/docs/heatmap')

  await expect(page.getByRole('grid', { name: FIRST })).toBeVisible()
  await expect(page.getByRole('grid', { name: SECOND })).toBeVisible()
})

test('each cell sits under its row header, and a missing value reads No data', async ({ page }) => {
  await page.goto('/docs/heatmap')

  const platform = page.getByRole('grid', { name: FIRST }).getByRole('row', { name: /^Platform / })
  await expect(platform.getByRole('rowheader', { name: 'Platform' })).toBeVisible()
  await expect(platform.getByRole('gridcell', { name: '21', exact: true })).toBeVisible()

  const events = page.getByRole('grid', { name: SECOND }).getByRole('row', { name: /^Events / })
  await expect(events.getByRole('gridcell', { name: 'No data', exact: true })).toBeVisible()
})

test('selecting a cell of the second example shows it outside the grid', async ({ page }) => {
  await page.goto('/docs/heatmap')

  const grid = page.getByRole('grid', { name: SECOND })
  await grid
    .getByRole('row', { name: /^Referral / })
    .getByRole('gridcell', { name: '12.7%', exact: true })
    .click()
  await expect(page.getByText('Selected: Referral, Team, 12.7%')).toBeVisible()
})

test('at 320 px the heatmap scrolls inside its own group, not the page', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 812 })
  await page.goto('/docs/heatmap')

  const group = page.getByRole('group', { name: FIRST, exact: true })
  await expect(group).toBeVisible()
  const sizes = await page.evaluate(() => ({
    root: [document.documentElement.scrollWidth, document.documentElement.clientWidth],
  }))
  expect(sizes.root[0]).toBeLessThanOrEqual(sizes.root[1] ?? 0)
  const inner = await group.evaluate((el) => [el.scrollWidth, el.clientWidth])
  expect(inner[0]).toBeGreaterThan(inner[1] ?? 0)
})
