import { expect, type Page, test } from '@playwright/test'
import { revealCharts, themeSuite } from './support'

themeSuite({
  name: 'donut-chart',
  path: '/docs/donut-chart',
  h1: 'DonutChart',
  chart: 'Revenue by service line',
})

const NAMES = [
  'Revenue by service line',
  'Hours logged by trade',
  'Unpaid invoices by age',
  'Jobs by status',
]

const chartOf = (page: Page, name: string) => page.getByRole('application', { name, exact: true })

const layoutOf = (page: Page, name: string) =>
  chartOf(page, name).locator('[data-ch-part="donut"]').getAttribute('data-ch-layout')

test('/docs/donut-chart is a page, and the sidebar links to it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  const response = await page.goto('/docs/donut-chart')
  expect(response?.status()).toBe(200)

  await expect(page.getByRole('heading', { level: 1, name: 'DonutChart' })).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Documentation' })
  const link = nav.getByRole('link', { name: 'DonutChart', exact: true })
  await expect(link).toHaveAttribute('href', '/docs/donut-chart')
  await expect(link).toHaveAttribute('aria-current', 'page')
  await expect(nav.locator('.nav-soon', { hasText: 'DonutChart' })).toHaveCount(0)
})

test('/docs/donut-chart documents the DonutChart props once', async ({ page }) => {
  await page.goto('/docs/donut-chart')

  await expect(page.getByRole('region', { name: 'Props of DonutChart', exact: true })).toHaveCount(
    1,
  )
})

test('the page has all four examples', async ({ page }) => {
  await page.goto('/docs/donut-chart')
  await revealCharts(page)

  for (const name of NAMES) await expect(chartOf(page, name)).toBeVisible()
})

test.describe('1280 px', () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  test('the lists are right of the ring, except the forced bottom one and the ring alone', async ({
    page,
  }) => {
    await page.goto('/docs/donut-chart')
    await revealCharts(page)

    expect(await layoutOf(page, 'Revenue by service line')).toBe('right')
    expect(await layoutOf(page, 'Hours logged by trade')).toBe('right')
    expect(await layoutOf(page, 'Unpaid invoices by age')).toBe('bottom')
    expect(await layoutOf(page, 'Jobs by status')).toBe('none')

    const revenue = chartOf(page, 'Revenue by service line')
    await expect(revenue.locator('[data-ch-part="donut-slice"]')).toHaveCount(5)
    await expect(revenue.locator('[data-ch-part="donut-total"]')).toHaveText('$1.84M')
    await expect(revenue.locator('[data-ch-part="donut-row"]').last()).toContainText('Other')
    await expect(
      chartOf(page, 'Hours logged by trade').locator('[data-ch-part="donut-row"]').last(),
    ).toContainText('Other')
    await expect(
      chartOf(page, 'Jobs by status').locator('[data-ch-part="donut-slice"]'),
    ).toHaveCount(3)
  })

  test('the keyboard walks the slices and announces the share of the total', async ({ page }) => {
    await page.goto('/docs/donut-chart')
    const chart = chartOf(page, 'Revenue by service line')
    await chart.focus()
    const live = chart.locator('xpath=ancestor::figure[1]').locator('[aria-live]')
    await expect(live).toHaveText('1 of 5, Installs, $773K, 42% of total')
    await page.keyboard.press('End')
    await expect(live).toHaveText('5 of 5, Other, $147K, 8% of total')
  })
})

test.describe('375 px', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('every list is under the ring', async ({ page }) => {
    await page.goto('/docs/donut-chart')
    await revealCharts(page)

    for (const name of NAMES.slice(0, 3)) expect(await layoutOf(page, name)).toBe('bottom')
    expect(await layoutOf(page, 'Jobs by status')).toBe('none')
  })
})
