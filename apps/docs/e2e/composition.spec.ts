import { expect, test } from '@playwright/test'
import { revealCharts, themeSuite } from './support'

themeSuite({
  name: 'composition',
  path: '/docs/composition',
  h1: 'Composition',
  chart: 'Gross margin by week, against a 40% target',
})

test('/docs/composition is a page, and the sidebar links to it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  const response = await page.goto('/docs/composition')
  expect(response?.status()).toBe(200)

  await expect(page.getByRole('heading', { level: 1, name: 'Composition' })).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Documentation' })
  const link = nav.getByRole('link', { name: 'Composition' })
  await expect(link).toHaveAttribute('href', '/docs/composition')
  await expect(link).toHaveAttribute('aria-current', 'page')
  await expect(nav.locator('.nav-soon', { hasText: 'Composition' })).toHaveCount(0)
})

test('/docs/composition shows all four examples and a props table for Chart and the 18 blocks', async ({
  page,
}) => {
  await page.goto('/docs/composition')
  await revealCharts(page)

  await expect(page.locator('[data-ch-root]')).toHaveCount(4)
  await expect(page.getByRole('region', { name: /^Props of / })).toHaveCount(19)
})

test('the bridge is announced in x order, with the change of each step', async ({ page }) => {
  await page.goto('/docs/composition')
  await revealCharts(page)
  const chart = page.getByRole('application', { name: 'Profit bridge from Q2 to Q3' })
  const live = page.locator('[data-ch-root]').filter({ has: chart }).locator('[aria-live="polite"]')
  await chart.focus()
  await page.keyboard.press('Home')

  const announced: string[] = []
  for (let i = 0; i < 6; i++) {
    if (i > 0) await page.keyboard.press('ArrowRight')
    await expect(live).toContainText(`${i + 1} of 6`)
    announced.push((await live.textContent()) ?? '')
  }
  expect(announced.map((text) => text.replace(/^\d of 6,\s*/, ''))).toEqual([
    'Q2, 120',
    'Volume, +30',
    'Price, +20',
    'Costs, -30',
    'Returns, -12',
    'Q3, 128',
  ])
})
