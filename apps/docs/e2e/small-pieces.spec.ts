import { expect, test } from '@playwright/test'
import { revealCharts, themeSuite } from './support'

themeSuite({
  name: 'small-pieces',
  path: '/docs/small-pieces',
  h1: 'Small pieces',
  chart: 'Orders against plan, by month',
})

test('/docs/small-pieces is a page, and the sidebar links to it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  const response = await page.goto('/docs/small-pieces')
  expect(response?.status()).toBe(200)

  await expect(page.getByRole('heading', { level: 1, name: 'Small pieces' })).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Documentation' })
  const link = nav.getByRole('link', { name: 'Small pieces' })
  await expect(link).toHaveAttribute('href', '/docs/small-pieces')
  await expect(link).toHaveAttribute('aria-current', 'page')
  await expect(nav.locator('.nav-soon', { hasText: 'Small pieces' })).toHaveCount(0)
})

test('/docs/small-pieces has a props table for each of the eleven pieces', async ({ page }) => {
  await page.goto('/docs/small-pieces')

  const regions = page.getByRole('region', { name: /^Props of / })
  await expect(regions).toHaveCount(11)
  for (const name of [
    'Stat',
    'Delta',
    'InlineBar',
    'DotCount',
    'Sparkline',
    'Meter',
    'RangeMeter',
    'ZoneMeter',
    'ShareBar',
    'Legend',
    'TooltipPill',
  ]) {
    await expect(page.getByRole('region', { name: `Props of ${name}` })).toHaveCount(1)
  }
})

test('the examples render their pieces as HTML, with accessible names', async ({ page }) => {
  await page.goto('/docs/small-pieces')
  await revealCharts(page)

  // kpi-row
  await expect(page.getByText('Gross margin', { exact: true })).toBeVisible()
  await expect(page.getByRole('img', { name: 'West revenue: 268, target 450' })).toBeVisible()
  await expect(page.getByRole('table', { name: 'Revenue and open jobs by region' })).toBeVisible()

  // meters
  await expect(page.getByRole('meter', { name: 'Sales target' })).toHaveAttribute(
    'aria-valuetext',
    '68%, target 80%',
  )
  await expect(page.getByRole('meter', { name: 'Largest contentful paint' })).toHaveAttribute(
    'aria-valuetext',
    '3.1, Needs work',
  )
  await expect(page.getByRole('img', { name: 'Margin: 31% against 38%' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Revenue by channel' })).toBeVisible()
})

test('the legend names the chart series, and the tooltip is a segmented pill', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/docs/small-pieces')
  await revealCharts(page)

  const chart = page.getByRole('application', { name: 'Orders against plan, by month' })
  await expect(page.locator('.ch-legend').getByText('Plan', { exact: true })).toBeVisible()

  await chart.focus()
  await page.keyboard.press('Home')
  await expect(page.locator('[data-ch-part="tooltip-pill"]')).toBeVisible()
  await expect(page.locator('[data-ch-part="tooltip-pill"]')).toContainText('Jan')
  await expect(page.locator('[data-ch-part="tooltip-pill"]')).toContainText('+20')
})
