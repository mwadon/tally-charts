import { expect, test } from '@playwright/test'
import { revealCharts, themeSuite } from './support'

themeSuite({
  name: 'scatter-chart',
  path: '/docs/scatter-chart',
  h1: 'ScatterChart',
  chart: 'Margin by crew hours, one dot per job',
})

test('/docs/scatter-chart is a page, and the sidebar links to it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  const response = await page.goto('/docs/scatter-chart')
  expect(response?.status()).toBe(200)

  await expect(page.getByRole('heading', { level: 1, name: 'ScatterChart' })).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Documentation' })
  const link = nav.getByRole('link', { name: 'ScatterChart', exact: true })
  await expect(link).toHaveAttribute('href', '/docs/scatter-chart')
  await expect(link).toHaveAttribute('aria-current', 'page')
  await expect(nav.locator('.nav-soon', { hasText: 'ScatterChart' })).toHaveCount(0)
})

test('/docs/scatter-chart documents the ScatterChart props once', async ({ page }) => {
  await page.goto('/docs/scatter-chart')

  await expect(
    page.getByRole('region', { name: 'Props of ScatterChart', exact: true }),
  ).toHaveCount(1)
})

test('the page has all four examples', async ({ page }) => {
  await page.goto('/docs/scatter-chart')
  await revealCharts(page)

  for (const name of [
    'Margin by crew hours, one dot per job',
    'Margin by job size, bubble area is crew hours',
    'Margin by job size, both axes fixed',
    'Margin by job size, with a legend',
  ]) {
    await expect(page.getByRole('application', { name })).toBeVisible()
  }
})

test('the bubble example is a client example with a loss tone and a target label', async ({
  page,
}) => {
  await page.goto('/docs/scatter-chart')
  await revealCharts(page)
  const chart = page.getByRole('application', {
    name: 'Margin by job size, bubble area is crew hours',
  })
  await expect(chart.locator('[data-ch-part="bubble"][data-ch-tone="loss"]')).toHaveCount(6)
  await expect(chart.locator('[data-ch-part="bubble"][data-ch-tone="accent"]')).toHaveCount(10)
  await expect(chart.locator('[data-ch-part="target-label"]')).toHaveText('target 32%')
})
