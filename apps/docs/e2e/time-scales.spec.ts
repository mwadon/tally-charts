import { expect, test } from '@playwright/test'
import { themeSuite } from './support'

themeSuite({
  name: 'time-scales',
  path: '/docs/time-scales',
  h1: 'Time scales',
  chart: 'Daily sign-ups with one unreadable date',
})

test('/docs/time-scales is a page, and the sidebar links to it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  const response = await page.goto('/docs/time-scales')
  expect(response?.status()).toBe(200)

  await expect(page.getByRole('heading', { level: 1, name: 'Time scales' })).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Documentation' })
  const link = nav.getByRole('link', { name: 'Time scales' })
  await expect(link).toHaveAttribute('href', '/docs/time-scales')
  await expect(link).toHaveAttribute('aria-current', 'page')
  await expect(nav.locator('.nav-soon', { hasText: 'Time scales' })).toHaveCount(0)
})

test('/docs/time-scales documents 2 functions', async ({ page }) => {
  await page.goto('/docs/time-scales')

  await expect(page.getByRole('region', { name: /^Parameters of / })).toHaveCount(2)
  await expect(page.getByRole('region', { name: 'Parameters of toTime', exact: true })).toHaveCount(
    1,
  )
  await expect(
    page.getByRole('region', { name: 'Parameters of toNumber', exact: true }),
  ).toHaveCount(1)
})

test('the chart breaks the line at the date that cannot be read', async ({ page }) => {
  await page.goto('/docs/time-scales')

  const chart = page.getByRole('application', { name: 'Daily sign-ups with one unreadable date' })
  const live = page.locator('[data-ch-root]').filter({ has: chart }).locator('[aria-live="polite"]')
  await chart.focus()
  await page.keyboard.press('Home')
  await expect(live).toContainText('1 of 7')
  await expect(live).toContainText('Jan 5')

  await page.keyboard.press('End')
  await expect(live).toContainText('7 of 7')
  await expect(live).toContainText('66')
})
