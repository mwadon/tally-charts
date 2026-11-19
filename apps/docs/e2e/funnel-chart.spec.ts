import { expect, type Page, test } from '@playwright/test'
import { revealCharts, themeSuite } from './support'

themeSuite({
  name: 'funnel-chart',
  path: '/docs/funnel-chart',
  h1: 'FunnelChart',
  chart: 'From lead to paid job',
})

test('/docs/funnel-chart is a page, and the sidebar links to it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  const response = await page.goto('/docs/funnel-chart')
  expect(response?.status()).toBe(200)

  await expect(page.getByRole('heading', { level: 1, name: 'FunnelChart' })).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Documentation' })
  const link = nav.getByRole('link', { name: 'FunnelChart', exact: true })
  await expect(link).toHaveAttribute('href', '/docs/funnel-chart')
  await expect(link).toHaveAttribute('aria-current', 'page')
  await expect(nav.locator('.nav-soon', { hasText: 'FunnelChart' })).toHaveCount(0)
})

test('/docs/funnel-chart documents the FunnelChart props once', async ({ page }) => {
  await page.goto('/docs/funnel-chart')

  await expect(page.getByRole('region', { name: 'Props of FunnelChart', exact: true })).toHaveCount(
    1,
  )
})

test('the page has all four examples', async ({ page }) => {
  await page.goto('/docs/funnel-chart')
  await revealCharts(page)

  for (const name of [
    'From lead to paid job',
    'Leads to paid jobs, by source',
    'Crew hiring, applications to first day',
    'Estimated job value, lead to paid',
  ]) {
    await expect(page.getByRole('application', { name, exact: true })).toBeVisible()
  }
})

const orientationOf = (page: Page, name: string) =>
  page
    .getByRole('application', { name, exact: true })
    .locator('[data-ch-part="funnel"]')
    .getAttribute('data-ch-orientation')

test.describe('1280 px', () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  test('the cards are horizontal, except the forced vertical one, and mark the weakest rate', async ({
    page,
  }) => {
    await page.goto('/docs/funnel-chart')
    await revealCharts(page)

    expect(await orientationOf(page, 'From lead to paid job')).toBe('horizontal')
    expect(await orientationOf(page, 'Leads to paid jobs, by source')).toBe('horizontal')
    expect(await orientationOf(page, 'Estimated job value, lead to paid')).toBe('horizontal')
    expect(await orientationOf(page, 'Crew hiring, applications to first day')).toBe('vertical')

    const chart = page.getByRole('application', { name: 'From lead to paid job', exact: true })
    await expect(chart.locator('[data-ch-part="funnel-rate"][data-ch-weakest="true"]')).toHaveText(
      '56%',
    )
    const bySource = page.getByRole('application', {
      name: 'Leads to paid jobs, by source',
      exact: true,
    })
    await expect(bySource.locator('[data-ch-part="funnel-area"]')).toHaveCount(4)
  })
})

test.describe('375 px', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('every card is vertical', async ({ page }) => {
    await page.goto('/docs/funnel-chart')
    await revealCharts(page)

    for (const name of [
      'From lead to paid job',
      'Leads to paid jobs, by source',
      'Crew hiring, applications to first day',
      'Estimated job value, lead to paid',
    ]) {
      expect(await orientationOf(page, name)).toBe('vertical')
    }
  })
})
